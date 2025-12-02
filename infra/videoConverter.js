// infra/videoConverter.js
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { resolveOutputDir } = require('./configService');

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

    const parsed = path.parse(inputPath);

    // Usa config global / pasta padrão
    const targetDir = resolveOutputDir(parsed.dir, outputDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.join(targetDir, `${parsed.name}.mp3`);

    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Vídeo -> GIF
 */
function convertVideoToGif(inputPath, options = {}) {
  const { width, fps, outputDir } = options;

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const parsed = path.parse(inputPath);

    // Usa config global / pasta padrão
    const targetDir = resolveOutputDir(parsed.dir, outputDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.join(targetDir, `${parsed.name}.gif`);

    let command = ffmpeg(inputPath);

    if (width && Number.isFinite(width)) {
      command = command.size(`${Math.round(width)}x?`);
    }

    if (fps && Number.isFinite(fps)) {
      command = command.fps(Math.round(fps));
    }

    command
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        resolve(outputPath);
      })
      .save(outputPath);
  });
}

/**
 * Lê FPS de um vídeo usando ffprobe.
 */
function getVideoFps(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);

      try {
        const streams = metadata.streams || [];
        const videoStream = streams.find((s) => s.codec_type === 'video');
        if (!videoStream || !videoStream.r_frame_rate) {
          return reject(new Error('Não foi possível determinar o FPS do vídeo.'));
        }

        const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
        if (!num || !den) {
          return reject(new Error('FPS inválido retornado pelo ffprobe.'));
        }

        const fps = num / den;
        resolve(fps);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Extrai TODOS os frames do vídeo para PNGs numerados.
 * Retorna lista de caminhos dos frames.
 *
 * ⚠️ Aqui **não** usamos resolveOutputDir porque é saída temporária
 * controlada pela camada de spritesheet (ela já decide a pasta).
 */
function extractAllFramesToPngs(inputPath, options = {}) {
  const { width, outputDir } = options;

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }

    const parsed = path.parse(inputPath);
    const baseDir = outputDir || parsed.dir;

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    // Subpasta específica para frames
    const framesDir = path.join(baseDir, `${parsed.name}_frames`);

    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
    }

    const framePattern = path.join(framesDir, 'frame_%05d.png');

    let command = ffmpeg(inputPath);

    if (width && Number.isFinite(width)) {
      command = command.size(`${Math.round(width)}x?`);
    }

    command
      .output(framePattern)
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        try {
          const files = fs
            .readdirSync(framesDir)
            .filter((f) => f.toLowerCase().endsWith('.png'))
            .sort()
            .map((f) => path.join(framesDir, f));

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
