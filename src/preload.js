const { contextBridge, ipcRenderer } = require('electron');

// Expose safe methods to the renderer
contextBridge.exposeInMainWorld('astro', {
  calculateChart: (params) => ipcRenderer.invoke('calculate-chart', params),
  calculateProgressions: (params) => ipcRenderer.invoke('calculate-progressions', params),
  calculateSolarReturn: (params) => ipcRenderer.invoke('calculate-solar-return', params),
  calculateLunarReturn: (params) => ipcRenderer.invoke('calculate-lunar-return', params),
  findEclipses: (params) => ipcRenderer.invoke('find-eclipses', params),
  findEclipseActivations: (params) => ipcRenderer.invoke('find-eclipse-activations', params),
  calculateTransitTimeline: (params) => ipcRenderer.invoke('calculate-transit-timeline', params),
  searchPlanetaryConfigurations: (criteria, startDate, endDate) =>
    ipcRenderer.invoke('search-planetary-configurations', { criteria, startDate, endDate }),
  searchEclipses: (criteria, startDate, endDate) =>
    ipcRenderer.invoke('search-eclipses', { criteria, startDate, endDate }),
  getEphemerisMetadata: () => ipcRenderer.invoke('get-ephemeris-metadata'),
  chatWithClaude: (params) => ipcRenderer.invoke('chat-with-claude', params),
  exportChartImage: (params) => ipcRenderer.invoke('export-chart-image', params),
  writeDebugLog: (params) => ipcRenderer.invoke('write-debug-log', params),
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  generateIngressChart: (params) => ipcRenderer.invoke('generate-ingress-chart', params)
});
