// infra/imageConverter.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Converte uma imagem para um formato alvo com opções.
 *
 * @param {string} inputPath - Caminho do arquivo de entrada.
 * @param {object} options
 * @param {string} options.targetFormat - 'jpg' | 'jpeg' | 'png' | 'webp'
 * @param {number} [options.quality] - Qualidade (0–100) para formatos com compressão.
 * @param {number} [options.width] - Largura desejada (redimensiona mantendo proporção).
 * @param {string} [options.outputDir] - Pasta de saída (se não passar, usa a mesma do input).
 *
 * @returns {Promise<string>} - Caminho do arquivo gerado.
 */
async function convertImage(inputPath, options) {
  const { targetFormat, quality, width, outputDir } = options;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowedFormats.includes(String(targetFormat).toLowerCase())) {
    throw new Error(
      `Formato alvo inválido: ${targetFormat}. Use: ${allowedFormats.join(', ')}`
    );
  }

  const parsed = path.parse(inputPath);
  const normalizedFormat =
    targetFormat.toLowerCase() === 'jpg' ? 'jpeg' : targetFormat.toLowerCase();

  const targetDir = outputDir || parsed.dir;
  const outputPath = path.join(targetDir, `${parsed.name}.${normalizedFormat === 'jpeg' ? 'jpg' : normalizedFormat}`);

  let pipeline = sharp(inputPath);

  if (width && Number.isFinite(width)) {
    pipeline = pipeline.resize({ width: Math.round(width) });
  }

  const sharpOptions = {};
  if (quality && Number.isFinite(quality)) {
    sharpOptions.quality = Math.max(1, Math.min(100, Math.round(quality)));
  }

  switch (normalizedFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg(sharpOptions);
      break;
    case 'png':
      pipeline = pipeline.png(sharpOptions);
      break;
    case 'webp':
      pipeline = pipeline.webp(sharpOptions);
      break;
    default:
      throw new Error(`Formato ainda não suportado internamente: ${normalizedFormat}`);
  }

  await pipeline.toFile(outputPath);
  return outputPath;
}

/**
 * Função de compatibilidade: converte qualquer coisa para JPG.
 * Ainda é usada pelo MVP da UI (não vamos quebrar isso agora).
 */
async function convertImageToJpeg(inputPath, outputDir) {
  return convertImage(inputPath, {
    targetFormat: 'jpg',
    quality: 80,
    outputDir,
  });
}

module.exports = {
  convertImage,
  convertImageToJpeg,
};
