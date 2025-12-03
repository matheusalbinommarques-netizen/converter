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
 * Meta JSON ganha: frameWidth, frameHeight, frameCount, columns, rows, videoFps.
 * Saída vai sempre para:
 *   Downloads/Mídias convertidas/Spritesheets criados
 * (a não ser que options.outputDir seja sobrescrito).
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

  // 🔹 Raiz onde TUDO relacionado a spritesheet desse vídeo vai ficar
  //    (frames temporários + PNG + JSON)
  const spritesRoot =
    options.outputDir || getOutputDirForKind('video-spritesheet');

  if (!fs.existsSync(spritesRoot)) {
    fs.mkdirSync(spritesRoot, { recursive: true });
  }

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

  // 1) Extrai TODOS os frames para dentro de:
  //    <spritesRoot>/<nomeDoVideo>_frames/frame-000001.png ...
  const framePaths = await extractAllFramesToPngs(inputPath, {
    width,
    outputDir: spritesRoot, // 👈 raiz de spritesheets
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

  // 3) Gera spritesheet com todas as imagens, em ordem, saindo em spritesRoot
  const spriteResult = await buildSpritesheetFromImages(framePaths, {
    columns,
    outputName,
    outputDir: spritesRoot, // 👈 PNG + JSON em "Spritesheets criados"
  });

  // 4) Abre o JSON gerado e acrescenta metadados de vídeo
  try {
    const metaPath = spriteResult.metaPath;
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    const meta = JSON.parse(metaRaw);

    meta.videoFps = videoFps;
    meta.frameCount =
      meta.frameCount ||
      (Array.isArray(meta.frames) ? meta.frames.length : undefined) ||
      framePaths.length;

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
      // framesDir = diretório pai dos frames: .../<nome>_frames
      const framesDir =
        framePaths.length > 0
          ? path.dirname(framePaths[0])
          : null;

      for (const p of framePaths) {
        try {
          fs.unlinkSync(p);
        } catch {
          /* ignora erro de remoção individual */
        }
      }

      if (framesDir && fs.existsSync(framesDir)) {
        // Node 20+ / 25: usar rmSync com recursive
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(
        '[videoToSpritesheet] Falha ao limpar frames temporários:',
        err.message
      );
    }
  }

  return spriteResult;
}

module.exports = {
  videoToSpritesheet,
};
