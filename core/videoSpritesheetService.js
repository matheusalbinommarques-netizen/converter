// core/videoSpritesheetService.js
const fs = require('fs');
const path = require('path');
const {
  extractAllFramesToPngs,
  getVideoFps,
} = require('../infra/videoConverter');
const { buildSpritesheetFromImages } = require('./spriteService');
const { getOutputDirForKind } = require('../infra/outputService');

/**
 * Vídeo -> Spritesheet (PNG + JSON).
 *
 * Meta JSON ganha: frameWidth, frameHeight, frameCount, columns, rows, videoFps.
 *
 * Saída final (sheet + JSON):
 *   Downloads/Mídias convertidas/Spritesheets criados
 */
async function videoToSpritesheet(inputPath, options = {}) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const allowedInputs = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];

  if (!allowedInputs.includes(ext)) {
    throw new Error(
      `Formato de entrada não suportado para vídeo→spritesheet: ${ext}. ` +
        `Use um destes: ${allowedInputs.join(', ')}`
    );
  }

  const parsed = path.parse(inputPath);

  const width =
    options.width && Number.isFinite(options.width)
      ? Math.max(32, Math.round(options.width))
      : undefined;

  const columns =
    options.columns && Number.isFinite(options.columns)
      ? Math.max(1, Math.round(options.columns))
      : undefined;

  const outputName = options.outputName || `${parsed.name}_sheet`;
  const cleanupFrames = options.cleanupFrames !== false;

  // Diretório de saída final para spritesheets (PNG + JSON)
  const spriteOutputDir = getOutputDirForKind('video-spritesheet');

  // 1) Extrai TODOS os frames (pode ser em um diretório temporário)
  const framesDir = path.join(spriteOutputDir, `${parsed.name}_frames`);
  const framePaths = await extractAllFramesToPngs(inputPath, {
    width,
    outputDir: framesDir,
  });

  if (!framePaths || framePaths.length === 0) {
    throw new Error('Nenhum frame foi gerado a partir do vídeo.');
  }

  // 2) Descobre FPS real do vídeo
  let videoFps = 12;
  try {
    const fps = await getVideoFps(inputPath);
    if (fps && Number.isFinite(fps)) {
      videoFps = fps;
    }
  } catch (err) {
    console.warn(
      '[videoToSpritesheet] Não foi possível obter FPS exato:',
      err.message
    );
  }

  // 3) Gera spritesheet com todas as imagens, em ordem
  const spriteResult = await buildSpritesheetFromImages(framePaths, {
    columns,
    outputName,
    outputDir: spriteOutputDir,
  });

  // 4) Abre o JSON gerado e acrescenta metadados de vídeo
  try {
    const metaPath = spriteResult.metaPath;
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);

    meta.videoFps = videoFps;
    meta.frameCount =
      meta.frameCount || meta.frames?.length || framePaths.length;

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  } catch (err) {
    console.warn(
      '[videoToSpritesheet] Falha ao enriquecer meta JSON:',
      err.message
    );
  }

  // 5) Limpa frames temporários, se configurado
  if (cleanupFrames) {
    try {
      for (const p of framePaths) {
        fs.unlinkSync(p);
      }
      fs.rmdirSync(framesDir, { recursive: true });
    } catch (err) {
      console.warn('Falha ao limpar frames temporários:', err.message);
    }
  }

  return spriteResult;
}

module.exports = {
  videoToSpritesheet,
};
