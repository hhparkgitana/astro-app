const { contextBridge, ipcRenderer } = require('electron');

// Expose safe methods to the renderer
contextBridge.exposeInMainWorld('astro', {
  calculateChart: (params) => ipcRenderer.invoke('calculate-chart', params),
  calculateProgressions: (params) => ipcRenderer.invoke('calculate-progressions', params),
  chatWithClaude: (params) => ipcRenderer.invoke('chat-with-claude', params)
});
