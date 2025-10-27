const { contextBridge, ipcRenderer } = require('electron');

// Expose safe methods to the renderer
contextBridge.exposeInMainWorld('astro', {
  calculateChart: (params) => ipcRenderer.invoke('calculate-chart', params)
});
