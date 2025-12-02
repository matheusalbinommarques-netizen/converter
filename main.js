// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');

const { QueueManager } = require('./core/queueManager');
const { createTask } = require('./core/taskTypes');
const { rememberLastPreset } = require('./infra/configService');

let mainWindow = null;
const queueManager = new QueueManager();

// Cria a janela principal
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#020617',
    show: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Filtros por tipo de conversão
function getFileFiltersForKind(kind) {
  if (
    kind === 'image' ||
    kind === 'spritesheet' ||
    kind === 'spritesheet-video'
  ) {
    return [
      {
        name: 'Imagens',
        extensions: ['png', 'jpg', 'jpeg', 'webp'],
      },
    ];
  }

  if (
    kind === 'video-mp3' ||
    kind === 'video-gif' ||
    kind === 'video-spritesheet'
  ) {
    return [
      {
        name: 'Vídeos',
        extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'],
      },
    ];
  }

  return [
    {
      name: 'Arquivos',
      extensions: ['*'],
    },
  ];
}

// ==== IPC HANDLERS ====

// Abre diálogo de seleção de arquivos
ipcMain.handle('choose-files', async (event, kind) => {
  const filters = getFileFiltersForKind(kind);

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecionar arquivos para conversão',
    properties: ['openFile', 'multiSelections'],
    filters,
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths || [];
});

// Enfileira tarefas de conversão
ipcMain.handle('enqueue-tasks', async (event, payload) => {
  const { kind, filePaths, options } = payload || {};

  if (!kind || !Array.isArray(filePaths) || filePaths.length === 0) {
    throw new Error('Parâmetros inválidos para enqueue-tasks.');
  }

  // 🔹 Aqui entra o rememberLastPreset (Fase 3)
  try {
    rememberLastPreset(kind, options || {});
  } catch (err) {
    console.warn('[main] Falha ao lembrar lastPreset:', err.message);
  }

  const newTasks = [];

  // spritesheet (imagens) -> uma única task com vários inputs
  if (kind === 'spritesheet') {
    const task = createTask({
      kind,
      inputPaths: filePaths,
      options: options || {},
    });
    queueManager.addTask(task);
    newTasks.push(task);
  } else {
    // Demais tipos -> uma task por arquivo
    for (const p of filePaths) {
      const task = createTask({
        kind,
        inputPaths: [p],
        options: options || {},
      });
      queueManager.addTask(task);
      newTasks.push(task);
    }
  }

  return newTasks;
});

// Abrir pasta do arquivo de saída
ipcMain.handle('open-in-folder', async (event, fullPath) => {
  if (!fullPath) return;
  try {
    await shell.showItemInFolder(fullPath);
  } catch (err) {
    console.error('[main] Falha ao abrir pasta:', err.message);
  }
});

// Encaminhar eventos da fila para o renderer
function setupQueueEventsForwarding() {
  const forward = (type) => (task) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('queue-event', {
      type,
      task,
      errorMessage: task && task.errorMessage ? task.errorMessage : null,
    });
  };

  queueManager.on('task-added', forward('task-added'));
  queueManager.on('task-started', forward('task-started'));
  queueManager.on('task-completed', forward('task-completed'));
  queueManager.on('task-failed', (task, err) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('queue-event', {
      type: 'task-failed',
      task,
      errorMessage:
        (task && task.errorMessage) ||
        (err && err.message) ||
        'Falha desconhecida',
    });
  });
  queueManager.on('idle', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('queue-event', {
      type: 'idle',
      task: null,
      errorMessage: null,
    });
  });
}

// ==== CICLO DE VIDA DO APP ====

app.whenReady().then(() => {
  createWindow();
  setupQueueEventsForwarding();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // No macOS costuma manter apps rodando, mas aqui vamos simplificar
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
