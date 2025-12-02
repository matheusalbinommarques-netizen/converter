// infra/imageConverter.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { resolveOutputDir } = require('./configService');

/**
 * Converte uma imagem para um formato alvo com opções.
 *
 * @param {string} inputPath - Caminho do arquivo de entrada.
 * @param {object} options
 * @param {string} options.targetFormat - 'jpg' | 'jpeg' | 'png' | 'webp'
 * @param {number} [options.quality] - Qualidade (1–100) para formatos com compressão.
 * @param {number} [options.width] - Largura desejada (redimensiona mantendo proporção).
 * @param {string} [options.outputDir] - Pasta de saída (se não passar, usa regra do ConfigService).
 *
 * @returns {Promise<string>} - Caminho do arquivo gerado.
 */
async function convertImage(inputPath, options = {}) {
  const { targetFormat, quality, width, outputDir } = options;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
  const fmt = String(targetFormat || '').toLowerCase();

  if (!allowedFormats.includes(fmt)) {
    throw new Error(
      `Formato alvo inválido: ${targetFormat}. Use: ${allowedFormats.join(', ')}`
    );
  }

  const parsed = path.parse(inputPath);

  // Usa config global + pasta de entrada como fallback
  const targetDir = resolveOutputDir(parsed.dir, outputDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Internamente o sharp usa "jpeg", mas queremos salvar como .jpg no nome do arquivo
  const normalizedFormat = fmt === 'jpg' ? 'jpeg' : fmt;
  const outExt = fmt === 'jpeg' || fmt === 'jpg' ? 'jpg' : fmt;

  const outputPath = path.join(targetDir, `${parsed.name}.${outExt}`);

  let instance = sharp(inputPath);

  if (width && Number.isFinite(width)) {
    instance = instance.resize({
      width: Math.round(width),
      withoutEnlargement: true,
    });
  }

  let q;
  if (quality && Number.isFinite(quality)) {
    q = Math.max(1, Math.min(100, Math.round(quality)));
  }

  switch (normalizedFormat) {
    case 'jpeg':
      instance = instance.jpeg({
        quality: q ?? 80,
        mozjpeg: true,
      });
      break;
    case 'png':
      instance = instance.png({
        compressionLevel: 9,
      });
      break;
    case 'webp':
      instance = instance.webp({
        quality: q ?? 80,
      });
      break;
    default:
      throw new Error(`Formato alvo não suportado internamente: ${normalizedFormat}`);
  }

  await instance.toFile(outputPath);

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
