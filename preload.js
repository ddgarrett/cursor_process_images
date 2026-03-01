/**
 * Preload script: exposes safe APIs to renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (filters) => ipcRenderer.invoke('dialog:openFile', filters),
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  saveFile: (defaultPath, filters) => ipcRenderer.invoke('dialog:saveFile', defaultPath, filters),
  readFile: (filePath, encoding) => ipcRenderer.invoke('fs:readFile', filePath, encoding),
  writeFile: (filePath, data, encoding) => ipcRenderer.invoke('fs:writeFile', filePath, data, encoding),
  readdir: (dirPath, options) => ipcRenderer.invoke('fs:readdir', dirPath, options),
  stat: (filePath) => ipcRenderer.invoke('fs:stat', filePath),
  mkdir: (dirPath, recursive) => ipcRenderer.invoke('fs:mkdir', dirPath, recursive),
  copyFile: (src, dest) => ipcRenderer.invoke('fs:copyFile', src, dest),
  rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  pathJoin: (...segments) => ipcRenderer.invoke('path:join', ...segments),
  pathDirname: (p) => ipcRenderer.invoke('path:dirname', p),
  pathBasename: (p) => ipcRenderer.invoke('path:basename', p),
  pathSep: () => ipcRenderer.invoke('path:sep'),
  setCollectionRoot: (root) => ipcRenderer.invoke('collection:setRoot', root),
  loadExifDirectory: (dirPath) => ipcRenderer.invoke('exif:loadDirectory', dirPath),
});
