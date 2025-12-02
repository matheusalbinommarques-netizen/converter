// core/queueManager.js
const EventEmitter = require('events');
const { convertImageWithOptions } = require('./conversionService');
const { extractAudioAsMp3 } = require('./videoConversionService');
const { videoToGif } = require('./gifConversionService');
const { buildSpritesheetFromImages } = require('./spriteService');
const { videoToSpritesheet } = require('./videoSpritesheetService');
const { spritesheetToVideo } = require('./spritesheetToVideoService');

class QueueManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isRunning = false;
  }

  addTask(task) {
    this.queue.push(task);
    this.emit('task-added', task);
    this._runNext();
  }

  getPendingTasks() {
    return [...this.queue];
  }

  async _runNext() {
    if (this.isRunning) return;

    const task = this.queue.shift();
    if (!task) {
      this.emit('idle');
      return;
    }

    this.isRunning = true;
    task.status = 'running';
    this.emit('task-started', task);

    try {
      let results;

      switch (task.kind) {
        case 'image': {
          const promises = task.inputPaths.map((p) =>
            convertImageWithOptions(p, task.options || {})
          );
          results = await Promise.all(promises);
          break;
        }

        case 'video-mp3': {
          const promises = task.inputPaths.map((p) =>
            extractAudioAsMp3(p, task.options && task.options.outputDir)
          );
          results = await Promise.all(promises);
          break;
        }

        case 'video-gif': {
          const promises = task.inputPaths.map((p) =>
            videoToGif(p, task.options || {})
          );
          results = await Promise.all(promises);
          break;
        }

        case 'spritesheet': {
          const spriteResult = await buildSpritesheetFromImages(
            task.inputPaths,
            task.options || {}
          );
          results = [spriteResult.sheetPath, spriteResult.metaPath];
          break;
        }

        case 'video-spritesheet': {
          const spriteResult = await videoToSpritesheet(
            task.inputPaths[0],
            task.options || {}
          );
          results = [spriteResult.sheetPath, spriteResult.metaPath];
          break;
        }

        case 'spritesheet-video': {
          const result = await spritesheetToVideo(
            task.inputPaths[0],
            task.options || {}
          );
          results = [result.videoPath];
          break;
        }

        default:
          throw new Error(`Tipo de tarefa não suportado: ${task.kind}`);
      }

      task.status = 'completed';
      task.resultPaths = Array.isArray(results) ? results : [results];
      this.emit('task-completed', task);
    } catch (err) {
      console.error('[QueueManager] Task failed:', {
        id: task.id,
        kind: task.kind,
        inputPaths: task.inputPaths,
        error: err.message,
      });

      task.status = 'failed';
      task.errorMessage = err.message;
      this.emit('task-failed', task, err);
    } finally {
      this.isRunning = false;
      this._runNext();
    }
  }
}

module.exports = {
  QueueManager,
};
