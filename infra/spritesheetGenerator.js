// infra/spritesheetGenerator.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Gera uma spritesheet simples a partir de várias imagens.
 *
 * @param {string[]} imagePaths - caminhos das imagens (todas do mesmo tamanho).
 * @param {object} options
 * @param {number} [options.columns] - número de colunas (se não passar, tenta quadrado).
 * @param {string} [options.outputDir] - pasta de saída (padrão: pasta da primeira imagem).
 * @param {string} [options.outputName] - nome base do arquivo (sem extensão).
 *
 * @returns {Promise<{ sheetPath: string, metaPath: string }>}
 */
async function generateSpritesheet(imagePaths, options = {}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('É preciso informar pelo menos uma imagem para gerar a spritesheet.');
  }

  const validPaths = imagePaths.filter((p) => fs.existsSync(p));
  if (validPaths.length === 0) {
    throw new Error('Nenhuma das imagens fornecidas existe.');
  }

  const firstPath = validPaths[0];
  const firstMeta = await sharp(firstPath).metadata();

  if (!firstMeta.width || !firstMeta.height) {
    throw new Error('Não foi possível obter dimensões da primeira imagem.');
  }

  const frameWidth = firstMeta.width;
  const frameHeight = firstMeta.height;
  const frameCount = validPaths.length;

  // define colunas e linhas
  let columns = options.columns && Number.isFinite(options.columns)
    ? Math.max(1, Math.round(options.columns))
    : Math.ceil(Math.sqrt(frameCount));

  const rows = Math.ceil(frameCount / columns);

  const sheetWidth = frameWidth * columns;
  const sheetHeight = frameHeight * rows;

  const outputDir = options.outputDir || path.dirname(firstPath);
  const outputName = options.outputName || 'spritesheet';

  const sheetPath = path.join(outputDir, `${outputName}.png`);
  const metaPath = path.join(outputDir, `${outputName}.json`);

  // monta a lista de composites
  const composites = [];

  for (let i = 0; i < frameCount; i++) {
    const imgPath = validPaths[i];
    const col = i % columns;
    const row = Math.floor(i / columns);

    composites.push({
      input: imgPath,
      left: col * frameWidth,
      top: row * frameHeight,
    });
  }

  // cria imagem base transparente
  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(sheetPath);

  // metadados simples
  const meta = {
    frameWidth,
    frameHeight,
    columns,
    rows,
    frameCount,
    frames: validPaths.map((p, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return {
        index,
        source: p,
        x: col * frameWidth,
        y: row * frameHeight,
        width: frameWidth,
        height: frameHeight,
      };
    }),
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');

  return { sheetPath, metaPath };
}

module.exports = {
  generateSpritesheet,
};
