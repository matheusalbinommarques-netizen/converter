// infra/imageConverter.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Converte uma imagem qualquer para JPEG.
 * Se outputDir não for informado, salva na mesma pasta do arquivo de entrada.
 */
async function convertImageToJpeg(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const parsed = path.parse(inputPath);
  const targetDir = outputDir || parsed.dir;
  const outputPath = path.join(targetDir, `${parsed.name}.jpg`);

  await sharp(inputPath)
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  return outputPath;
}

module.exports = {
  convertImageToJpeg,
};
