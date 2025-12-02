// preload.js
const { contextBridge, ipcRenderer, webUtils } = require('electron');

console.log('Preload carregado - API exposta em window.api');

contextBridge.exposeInMainWorld('api', {
  // Abre o seletor de arquivos (já tratado no main pelo canal "choose-files")
  chooseFiles: (kind) => ipcRenderer.invoke('choose-files', { kind }),

  // Enfileira tarefas na QueueManager
  enqueueTasks: (payload) => ipcRenderer.invoke('enqueue-tasks', payload),

  // Escuta eventos da fila
  onQueueEvent: (callback) => {
    ipcRenderer.on('queue-event', (_event, data) => {
      callback(data);
    });
  },

  // 🔧 CORRIGIDO: envia apenas a string do caminho, como era no código original
  openInFolder: (fullPath) => ipcRenderer.invoke('open-in-folder', fullPath),

  // Presets de configuração
  getLastPreset: (kind) =>
    ipcRenderer.invoke('config-get-last-preset', { kind }),
  rememberLastPreset: (kind, options) =>
    ipcRenderer.invoke('config-remember-last-preset', { kind, options }),
});

// ---------- Drag & drop nativo (Electron 32+) ----------

// Evita navegação indesejada
window.addEventListener('dragover', (event) => {
  event.preventDefault();
});

window.addEventListener('drop', (event) => {
  event.preventDefault();

  const files = event.dataTransfer?.files;
  const paths = [];

  if (files && files.length) {
    for (const file of files) {
      try {
        // API nova do Electron para pegar o caminho real do File
        const p = webUtils.getPathForFile(file);
        if (p) paths.push(p);
      } catch (err) {
        console.error('[preload] webUtils.getPathForFile falhou:', err);
      }
    }
  }

  // Entrega os caminhos para o renderer (index.html)
  window.dispatchEvent(
    new CustomEvent('native-files-dropped', { detail: paths })
  );
});
