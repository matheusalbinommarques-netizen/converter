// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ⬇️ ANTES: (kind) => ipcRenderer.invoke('choose-files', { kind })
  chooseFiles: (kind) => ipcRenderer.invoke('choose-files', kind),

  enqueueTasks: (payload) => ipcRenderer.invoke('enqueue-tasks', payload),
  openInFolder: (targetPath) => ipcRenderer.invoke('open-in-folder', targetPath),
  onQueueEvent: (callback) => {
    ipcRenderer.on('queue-event', (_event, data) => {
      if (typeof callback === 'function') {
        callback(data);
      }
    });
  }
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Preload carregado - API de fila exposta em window.api');
});
