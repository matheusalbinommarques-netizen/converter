// core/conversionService.js
const fs = require('fs');
const path = require('path');
const {
  convertImageToJpeg,
  convertImage,
} = require('../infra/imageConverter');
const { getOutputDirForKind } = require('../infra/outputService');

/**
 * MVP antigo: converte PNG/JPG para JPG.
 * Continua existindo porque a UI atual usa essa função.
 *
 * Agora, se nenhum outputDir for informado, salva em:
 *   Downloads/Mídias convertidas/Imagens convertidas
 */
async function convertPngToJpeg(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
    throw new Error('Neste fluxo só aceitamos PNG ou JPG como entrada.');
  }

  const finalOutputDir = outputDir || getOutputDirForKind('image');

  const resultPath = await convertImageToJpeg(inputPath, finalOutputDir);
  return resultPath;
}

/**
 * Nova função genérica de conversão de imagem, alinhada com a Fase 2:
 * - Formatos: PNG, JPG, JPEG, WEBP (entrada e saída, com algumas restrições).
 * - Opções: formato alvo, qualidade, largura.
 *
 * Agora, se options.outputDir não for informado, salva em:
 *   Downloads/Mídias convertidas/Imagens convertidas
 */
async function convertImageWithOptions(inputPath, options = {}) {
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

  const finalOutputDir = outputDir || getOutputDirForKind('image');

  const resultPath = await convertImage(inputPath, {
    targetFormat,
    quality,
    width,
    outputDir: finalOutputDir,
  });

  return resultPath;
}

module.exports = {
  convertPngToJpeg,
  convertImageWithOptions,
};
