// core/spriteService.js
const fs = require('fs');
const path = require('path');
const { generateSpritesheet } = require('../infra/spritesheetGenerator');
const { getOutputDirForKind } = require('../infra/outputService');

/**
 * Regras de negócio para geração de spritesheet (a partir de imagens).
 *
 * Saída padrão (quando options.outputDir não é informado):
 *   Downloads/Mídias convertidas/Spritesheets criados
 */
async function buildSpritesheetFromImages(imagePaths, options = {}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('Informe pelo menos uma imagem.');
  }

  const resolvedPaths = imagePaths.map((p) => path.resolve(p));
  const existing = resolvedPaths.filter((p) => fs.existsSync(p));

  if (existing.length === 0) {
    throw new Error('Nenhuma das imagens fornecidas existe.');
  }

  const finalOutputDir = options.outputDir || getOutputDirForKind('spritesheet');

  const result = await generateSpritesheet(existing, {
    ...options,
    outputDir: finalOutputDir,
  });

  return result;
}

module.exports = {
  buildSpritesheetFromImages,
};
