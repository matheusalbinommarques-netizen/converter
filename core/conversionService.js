// core/conversionService.js
const fs = require('fs');
const path = require('path');
const {
  convertImageToJpeg,
  convertImage,
} = require('../infra/imageConverter');

/**
 * MVP antigo: converte PNG/JPG para JPG.
 * Continua existindo porque a UI atual usa essa função.
 */
async function convertPngToJpeg(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new Error('Neste fluxo só aceitamos PNG ou JPG como entrada.');
  }

  const resultPath = await convertImageToJpeg(inputPath, outputDir);
  return resultPath;
}

/**
 * Nova função genérica de conversão de imagem, alinhada com a Fase 2:
 * - Formatos: PNG, JPG, JPEG, WEBP (entrada e saída, com algumas restrições).
 * - Opções: formato alvo, qualidade, largura.
 */
async function convertImageWithOptions(inputPath, options) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const allowedInput = ['.png', '.jpg', '.jpeg', '.webp'];

  if (!allowedInput.includes(ext)) {
    throw new Error(
      `Formato de entrada não suportado: ${ext}. Use um destes: ${allowedInput.join(', ')}`
    );
  }

  const { targetFormat, quality, width, outputDir } = options;

  const resultPath = await convertImage(inputPath, {
    targetFormat,
    quality,
    width,
    outputDir,
  });

  return resultPath;
}

module.exports = {
  convertPngToJpeg,
  convertImageWithOptions,
};
