// infra/imageConverter.js
// Conversões de imagem (PNG/JPG/WEBP etc.) usando sharp
// Agora 100% integradas com outputService (Mídias convertidas).

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { getOutputDirForKind } = require('./outputService');

/**
 * Garante que o input existe.
 */
function assertInputExists(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }
}

/**
 * Converte uma imagem para JPEG “simples” (MVP antigo).
 * Se outputDir não for passado, usa:
 *   Downloads/Mídias convertidas/Imagens convertidas
 */
async function convertImageToJpeg(inputPath, outputDir) {
  assertInputExists(inputPath);

  const finalOutputDir = outputDir || getOutputDirForKind('image');

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outPath = path.join(finalOutputDir, `${baseName}.jpg`);

  await sharp(inputPath)
    .jpeg({
      quality: 80,
      mozjpeg: true,
    })
    .toFile(outPath);

  return outPath;
}

/**
 * Conversão genérica de imagem:
 * - targetFormat: 'jpg' | 'jpeg' | 'png' | 'webp'
 * - quality: 1–100 (opcional)
 * - width: px (opcional)
 * - outputDir: opcional (se não vier, vai para Imagens convertidas)
 */
async function convertImage(inputPath, options = {}) {
  assertInputExists(inputPath);

  const {
    targetFormat = 'webp',
    quality,
    width,
    outputDir,
  } = options;

  const normalizedFormat = String(targetFormat).toLowerCase();
  const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];

  if (!allowedFormats.includes(normalizedFormat)) {
    throw new Error(
      `Formato de saída inválido: ${normalizedFormat}. Use: ${allowedFormats.join(
        ', '
      )}`
    );
  }

  const finalOutputDir = outputDir || getOutputDirForKind('image');

  const baseName = path.basename(inputPath, path.extname(inputPath));
  const ext =
    normalizedFormat === 'jpeg' || normalizedFormat === 'jpg'
      ? 'jpg'
      : normalizedFormat;
  const outPath = path.join(finalOutputDir, `${baseName}.${ext}`);

  let pipeline = sharp(inputPath);

  if (width && Number.isFinite(width)) {
    pipeline = pipeline.resize({
      width: Math.max(1, Math.round(width)),
      withoutEnlargement: true,
    });
  }

  const formatOptions = {};
  if (typeof quality === 'number' && quality > 0 && quality <= 100) {
    formatOptions.quality = Math.round(quality);
  }

  pipeline = pipeline.toFormat(
    normalizedFormat === 'jpeg' ? 'jpeg' : normalizedFormat,
    formatOptions
  );

  await pipeline.toFile(outPath);
  return outPath;
}

module.exports = {
  convertImageToJpeg,
  convertImage,
};
