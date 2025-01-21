const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateBorder: (callback) => ipcRenderer.on('update-border', callback)
});
