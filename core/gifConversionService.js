// core/gifConversionService.js
const fs = require('fs');
const path = require('path');
const { convertVideoToGif } = require('../infra/videoConverter');

/**
 * Regras de negócio para vídeo -> GIF.
 * Aqui limitamos formatos de entrada e normalizamos opções.
 */
async function videoToGif(inputPath, options = {}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const allowedInputs = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];

  if (!allowedInputs.includes(ext)) {
    throw new Error(
      `Formato de entrada não suportado para GIF: ${ext}. Use um destes: ${allowedInputs.join(', ')}`
    );
  }

  const width = options.width && Number.isFinite(options.width)
    ? Math.max(100, Math.round(options.width))
    : undefined;

  const fps = options.fps && Number.isFinite(options.fps)
    ? Math.max(1, Math.round(options.fps))
    : undefined;

  const resultPath = await convertVideoToGif(inputPath, {
    width,
    fps,
    outputDir: options.outputDir,
  });

  return resultPath;
}

module.exports = {
  videoToGif,
};
