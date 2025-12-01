// core/conversionService.js
const fs = require('fs');
const path = require('path');
const { convertImageToJpeg } = require('../infra/imageConverter');

/**
 * MVP: converte PNG (ou JPG) para JPG.
 * No futuro vamos generalizar para outros formatos.
 */
async function convertPngToJpeg(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new Error('Neste MVP só aceitamos PNG ou JPG como entrada.');
  }

  const resultPath = await convertImageToJpeg(inputPath, outputDir);
  return resultPath;
}

module.exports = {
  convertPngToJpeg,
};
