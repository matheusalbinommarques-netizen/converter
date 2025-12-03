// core/queueManager.js
// Gerencia fila de conversões, executando uma tarefa por vez.

const EventEmitter = require('events');

const { convertImageWithOptions } = require('./conversionService');
const { extractAudioAsMp3 } = require('./videoConversionService');
const { videoToGif } = require('./gifConversionService');
const { buildSpritesheetFromImages } = require('./spriteService');
const { videoToSpritesheet } = require('./videoSpritesheetService');
const { spritesheetToVideo } = require('./spritesheetToVideoService');
const { imagesToPdf, pdfToImages } = require('./pdfConversionService');

class QueueManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
  }

  addTask(task) {
    this.queue.push(task);
    this.emit('task-added', task);
    this._processNext();
  }

  _processNext() {
    if (this.isProcessing) return;

    const next = this.queue.find((t) => t.status === 'pending');
    if (!next) {
      this.emit('idle');
      return;
    }

    this.isProcessing = true;
    this._runTask(next)
      .catch((err) => {
        console.error('[QueueManager] Erro inesperado ao rodar tarefa:', err);
      })
      .finally(() => {
        this.isProcessing = false;
        setImmediate(() => this._processNext());
      });
  }

  async _runTask(task) {
    task.status = 'running';
    this.emit('task-started', task);

    const kind = task.kind;
    const inputPaths = task.inputPaths || [];
    const opts = task.options || {};

    try {
      let resultPaths = [];

      switch (kind) {
        // ======================
        // IMAGENS
        // ======================
        case 'image': {
          for (const p of inputPaths) {
            const out = await convertImageWithOptions(p, {
              targetFormat: opts.targetFormat,
              quality: opts.quality,
              width: opts.width,
              // outputDir é resolvido pelo próprio converter via outputService
            });
            resultPaths.push(out);
          }
          break;
        }

        // ======================
        // VÍDEO -> ÁUDIO (MP3/WAV)
        // ======================
        case 'video-mp3': {
          for (const p of inputPaths) {
            const out = await extractAudioAsMp3(p);
            resultPaths.push(out);
          }
          break;
        }

        // ======================
        // VÍDEO -> GIF
        // ======================
        case 'video-gif': {
          for (const p of inputPaths) {
            const out = await videoToGif(p, {
              width: opts.width,
              fps: opts.fps,
            });
            resultPaths.push(out);
          }
          break;
        }

        // ======================
        // SPRITESHEET (IMAGENS -> SHEET)
        // ======================
        case 'spritesheet': {
          // Uma única sheet usando TODAS as imagens da task
          const spriteResult = await buildSpritesheetFromImages(inputPaths, {
            columns: opts.columns,
            outputName: opts.outputName,
            // outputDir resolvido internamente
          });

          resultPaths = [spriteResult.sheetPath, spriteResult.metaPath];
          break;
        }

        // ======================
        // VÍDEO -> SPRITESHEET
        // ======================
        case 'video-spritesheet': {
          // Aqui esperamos um vídeo por task
          const videoPath = inputPaths[0];
          const spriteResult = await videoToSpritesheet(videoPath, {
            width: opts.width,
            columns: opts.columns,
            frameCount: opts.frameCount,
            outputName: opts.outputName,
          });

          resultPaths = [spriteResult.sheetPath, spriteResult.metaPath];
          break;
        }

        // ======================
        // SPRITESHEET -> VÍDEO
        // ======================
        case 'spritesheet-video': {
          const sheetPath = inputPaths[0];
          const videoResult = await spritesheetToVideo(sheetPath, {
            fps: opts.fps,
          });
          resultPaths = [videoResult.videoPath];
          break;
        }

        // ======================
        // IMAGENS -> PDF
        // ======================
        case 'image-pdf': {
          // Queremos um único PDF com TODAS as imagens desta task
          const pdfPath = await imagesToPdf(inputPaths, {
            outputDir: opts.outputDir,
            outputName: opts.outputName,
          });
          resultPaths = [pdfPath];
          break;
        }

        // ======================
        // PDF -> IMAGENS
        // ======================
        case 'pdf-image': {
          const pdfPath = inputPaths[0];
          const images = await pdfToImages(pdfPath, {
            imageFormat: opts.imageFormat,
            dpi: opts.dpi,
            quality: opts.quality,
            outputDir: opts.outputDir,
          });
          resultPaths = images;
          break;
        }

        // ======================
        // DESCONHECIDO
        // ======================
        default:
          throw new Error(`Tipo de tarefa não suportado: ${kind}`);
      }

      task.resultPaths = Array.isArray(resultPaths)
        ? resultPaths
        : resultPaths != null
        ? [resultPaths]
        : [];
      task.status = 'completed';

      this.emit('task-completed', task);
    } catch (err) {
      task.status = 'failed';
      task.errorMessage = err.message || String(err);

      console.error('[QueueManager] Task failed:', {
        id: task.id,
        kind: task.kind,
        inputPaths: task.inputPaths,
        error: task.errorMessage,
      });

      this.emit('task-failed', task, err);
    }
  }
}

module.exports = {
  QueueManager,
};
