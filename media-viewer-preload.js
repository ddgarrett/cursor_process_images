/**
 * Preload for the media viewer window. Exposes mediaViewerAPI.getArgs() so the viewer
 * page can get the file path and type (image | video) passed when the window was opened.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mediaViewerAPI', {
  getArgs: () => ipcRenderer.invoke('get-media-viewer-args'),
});
