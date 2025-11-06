const { contextBridge, ipcRenderer } = require('electron');

// Expose safe methods to the renderer
contextBridge.exposeInMainWorld('astro', {
  calculateChart: (params) => ipcRenderer.invoke('calculate-chart', params),
  calculateProgressions: (params) => ipcRenderer.invoke('calculate-progressions', params),
  findEclipses: (params) => ipcRenderer.invoke('find-eclipses', params),
  findEclipseActivations: (params) => ipcRenderer.invoke('find-eclipse-activations', params),
  calculateTransitTimeline: (params) => ipcRenderer.invoke('calculate-transit-timeline', params),
  chatWithClaude: (params) => ipcRenderer.invoke('chat-with-claude', params),
  exportChartImage: (params) => ipcRenderer.invoke('export-chart-image', params),
  writeDebugLog: (params) => ipcRenderer.invoke('write-debug-log', params)
});
