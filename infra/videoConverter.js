// infra/videoConverter.js
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Vídeo -> MP3
 */
function convertVideoToMp3(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const { resolveOutputDir } = require('./configService');

const parsed = path.parse(inputPath);
const targetDir = resolveOutputDir(parsed.dir, outputDir);
const outputPath = path.join(targetDir, `${parsed.name}.mp3`);

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('error', (err) => {
        reject(new Error(`Erro no FFmpeg: ${err.message}`));
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Vídeo -> GIF (usando subset de frames)
 */
function convertVideoToGif(inputPath, options = {}) {
  const { width, fps, outputDir } = options;

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const parsed = path.parse(inputPath);
    const targetDir = outputDir || parsed.dir;
    const outputPath = path.join(targetDir, `${parsed.name}.gif`);

    let command = ffmpeg(inputPath);

    if (width && Number.isFinite(width)) {
      command = command.size(`${Math.round(width)}x?`);
    }

    if (fps && Number.isFinite(fps)) {
      command = command.fps(Math.round(fps));
    }

    command
      .toFormat('gif')
      .on('error', (err) => {
        reject(new Error(`Erro no FFmpeg (GIF): ${err.message}`));
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Descobre FPS do vídeo usando ffprobe.
 */
function getVideoFps(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        return reject(new Error(`Erro no ffprobe: ${err.message}`));
      }

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) {
        return reject(new Error('Nenhum stream de vídeo encontrado.'));
      }

      const rateStr =
        videoStream.r_frame_rate ||
        videoStream.avg_frame_rate ||
        videoStream.time_base;

      if (!rateStr || !rateStr.includes('/')) {
        return reject(new Error(`Não foi possível obter FPS a partir de: ${rateStr}`));
      }

      const [num, den] = rateStr.split('/').map(Number);
      if (!num || !den) {
        return reject(new Error(`FPS inválido em r_frame_rate: ${rateStr}`));
      }

      const fps = num / den;
      resolve(fps);
    });
  });
}

/**
 * Extrai TODOS os frames do vídeo como PNG, em ordem.
 *
 * @param {string} inputPath
 * @param {object} options
 * @param {number} [options.width] - largura desejada (px)
 * @param {string} [options.outputDir] - pasta onde salvar os frames
 *
 * @returns {Promise<string[]>} caminhos dos PNGs gerados (ordenados)
 */
function extractAllFramesToPngs(inputPath, options = {}) {
  const { width, outputDir } = options;

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const parsed = path.parse(inputPath);
    const targetDir =
      outputDir || path.join(parsed.dir, `${parsed.name}_frames`);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let command = ffmpeg(inputPath);

    if (width && Number.isFinite(width)) {
      command = command.size(`${Math.round(width)}x?`);
    }

    // -vsync 0 evita duplicar/pular frames
    command
      .output(path.join(targetDir, 'frame-%06d.png'))
      .outputOptions(['-vsync 0'])
      .on('error', (err) => {
        reject(new Error(`Erro no FFmpeg (all frames): ${err.message}`));
      })
      .on('end', () => {
        try {
          const files = fs
            .readdirSync(targetDir)
            .filter((f) => f.toLowerCase().endsWith('.png'))
            .sort()
            .map((f) => path.join(targetDir, f));

          resolve(files);
        } catch (err2) {
          reject(err2);
        }
      })
      .run();
  });
}

module.exports = {
  convertVideoToMp3,
  convertVideoToGif,
  getVideoFps,
  extractAllFramesToPngs,
};
