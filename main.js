/**
 * Main process for Process Images Electron app.
 * Creates window, handles IPC for file dialogs and file operations.
 */
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { loadDirectory } = require('./exifLoader.js');

let mainWindow = null;
let collectionRoot = null; // base path for image collection (for protocol)

/** Stored args per media viewer window (keyed by webContents.id) for get-media-viewer-args. */
const mediaViewerArgs = new Map();

function createViewerWindow(filePath, type) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    title: path.basename(filePath),
    webPreferences: {
      preload: path.join(__dirname, 'media-viewer-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const id = win.webContents.id;
  mediaViewerArgs.set(id, { filePath, type });

  win.webContents.on('destroyed', () => {
    mediaViewerArgs.delete(id);
  });

  win.loadFile(path.join(__dirname, 'renderer', 'viewer.html'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('collection', (request, callback) => {
    if (!collectionRoot) return callback({ error: -2 });
    const pathname = new URL(request.url).pathname || '';
    const subpath = pathname.replace(/^\/+/, '').split('/').map(s => decodeURIComponent(s)).filter(s => s && s !== '..').join(path.sep);
    const fullPath = path.normalize(path.join(collectionRoot, subpath));
    const rootNorm = path.normalize(collectionRoot);
    if (fullPath !== rootNorm && !fullPath.startsWith(rootNorm + path.sep)) return callback({ error: -3 });
    callback({ path: fullPath });
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// IPC: open file dialog (collection CSV)
ipcMain.handle('dialog:openFile', async (_, filters) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [{ name: 'Image Collection', extensions: ['csv'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC: open folder dialog
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC: save file dialog
ipcMain.handle('dialog:saveFile', async (_, defaultPath, filters) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: filters || [{ name: 'CSV', extensions: ['csv'] }],
  });
  return result.canceled ? null : result.filePath;
});

// IPC: read file (for renderer to get CSV or binary)
ipcMain.handle('fs:readFile', async (_, filePath, encoding) => {
  try {
    return await fs.readFile(filePath, encoding || 'utf8');
  } catch (e) {
    throw e;
  }
});

// IPC: write file
ipcMain.handle('fs:writeFile', async (_, filePath, data, encoding) => {
  await fs.writeFile(filePath, data, encoding || 'utf8');
});

// IPC: read directory (list dir)
ipcMain.handle('fs:readdir', async (_, dirPath, options) => {
  return await fs.readdir(dirPath, options || { withFileTypes: true });
});

// IPC: stat (is directory, etc.)
ipcMain.handle('fs:stat', async (_, filePath) => {
  const s = await fs.stat(filePath);
  return { isDirectory: s.isDirectory(), isFile: s.isFile(), size: s.size };
});

// IPC: mkdir recursive
ipcMain.handle('fs:mkdir', async (_, dirPath, recursive) => {
  await fs.mkdir(dirPath, { recursive: recursive !== false });
});

// IPC: copy file
ipcMain.handle('fs:copyFile', async (_, src, dest) => {
  await fs.copyFile(src, dest);
});

// IPC: rename (move) file
ipcMain.handle('fs:rename', async (_, oldPath, newPath) => {
  await fs.rename(oldPath, newPath);
});

// IPC: get path separator and join
ipcMain.handle('path:join', (_, ...segments) => path.join(...segments));
ipcMain.handle('path:dirname', (_, p) => path.dirname(p));
ipcMain.handle('path:basename', (_, p) => path.basename(p));
ipcMain.handle('path:sep', () => path.sep);

// Set collection root so collection:// URLs resolve to disk paths
ipcMain.handle('collection:setRoot', (_, root) => {
  collectionRoot = root || null;
});

// EXIF: load directory and return array of row objects
ipcMain.handle('exif:loadDirectory', async (_, dirPath) => {
  return loadDirectory(dirPath);
});

// Open viewer window: resolve collection:// URL to file path, then create viewer
ipcMain.handle('viewer:open', (_, mediaUrl, isVideo) => {
  let filePath;
  if (mediaUrl && mediaUrl.startsWith('collection://')) {
    const pathname = new URL(mediaUrl).pathname || '';
    const subpath = pathname.replace(/^\/+/, '').split('/').map(s => decodeURIComponent(s)).filter(s => s && s !== '..').join(path.sep);
    filePath = collectionRoot ? path.normalize(path.join(collectionRoot, subpath)) : null;
  } else {
    filePath = mediaUrl;
  }
  if (filePath) {
    createViewerWindow(filePath, isVideo ? 'video' : 'image');
  }
});

// Viewer window requests its args (file path + type) so it can display via file://
ipcMain.handle('get-media-viewer-args', (event) => {
  return mediaViewerArgs.get(event.sender.id) ?? null;
});
