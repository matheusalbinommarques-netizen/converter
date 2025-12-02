// infra/videoConverter.js
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// aponta o fluent-ffmpeg para o binário estático
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Converte um vídeo (ex.: MP4) para MP3 (áudio apenas).
 */
function convertVideoToMp3(inputPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const parsed = path.parse(inputPath);
    const targetDir = outputDir || parsed.dir;
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
 * Converte um vídeo em GIF animado com opções simples.
 *
 * @param {string} inputPath
 * @param {object} options
 * @param {number} [options.width] - largura do GIF (mantém proporção)
 * @param {number} [options.fps] - frames por segundo (ex.: 10, 12, 15)
 * @param {string} [options.outputDir]
 * @returns {Promise<string>} caminho do GIF gerado
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
      // redimensiona mantendo proporção
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

module.exports = {
  convertVideoToMp3,
  convertVideoToGif,
};
