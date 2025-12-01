// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  convertImage: (inputPath) => ipcRenderer.invoke('convert-image', inputPath)
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload carregado - API exposta em window.api');
});
