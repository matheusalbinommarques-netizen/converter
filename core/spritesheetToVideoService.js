// core/spritesheetToVideoService.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { getOutputDirForKind } = require('../infra/outputService');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Tenta ler metadados JSON gerados pelo spritesheet (do próprio app).
 * Usa: frameWidth, frameHeight, frameCount, videoFps (se tiver).
 * Se não encontrar, lança erro – que será tratado pelo chamador.
 */
function tryLoadSheetMetaJson(sheetPath) {
  const parsed = path.parse(sheetPath);
  const metaPath = path.join(parsed.dir, `${parsed.name}.json`);

  if (!fs.existsSync(metaPath)) {
    throw new Error(`JSON não encontrado: ${metaPath}`);
  }

  const raw = fs.readFileSync(metaPath, 'utf8');
  const meta = JSON.parse(raw);

  const frameWidth =
    meta.frameWidth ||
    meta.meta?.frameWidth ||
    (meta.frames && meta.frames[0]?.w);

  const frameHeight =
    meta.frameHeight ||
    meta.meta?.frameHeight ||
    (meta.frames && meta.frames[0]?.h);

  let frameCount =
    meta.frameCount ||
    meta.meta?.frameCount ||
    (meta.frames && meta.frames.length);

  const videoFps =
    meta.videoFps ||
    meta.meta?.videoFps ||
    null;

  if (!frameWidth || !frameHeight) {
    throw new Error(
      'Metadados da spritesheet não possuem frameWidth/frameHeight válidos.'
    );
  }

  return {
    frameWidth,
    frameHeight,
    frameCount: frameCount || 0,
    videoFps,
  };
}

/**
 * Spritesheet (PNG/WEBP + opcional JSON) -> vídeo MP4
 *
 * Saída padrão:
 *   Downloads/Mídias convertidas/Vídeos e áudios criados
 *
 * Modo A) Spritesheet gerada pelo app:
 *   - Usa PNG + JSON (frameWidth, frameHeight, frameCount, videoFps)
 *
 * Modo B) Qualquer spritesheet:
 *   - Se NÃO houver JSON, usa heurística:
 *     - se options.frameWidth/frameHeight existirem, usa
 *     - senão, tenta options.columns/rows/frameCount
 *     - senão, assume strip:
 *       - se w >= h → 1 linha, frames quadrados de tamanho h
 *       - senão     → 1 coluna, frames quadrados de tamanho w
 */
async function spritesheetToVideo(sheetPath, options = {}) {
  if (!fs.existsSync(sheetPath)) {
    throw new Error(`Arquivo de spritesheet não encontrado: ${sheetPath}`);
  }

  const ext = path.extname(sheetPath).toLowerCase();
  const allowedInputs = ['.png', '.webp'];

  if (!allowedInputs.includes(ext)) {
    throw new Error(
      'Modo "Spritesheet → Vídeo": selecione uma spritesheet em PNG ou WEBP.'
    );
  }

  const parsed = path.parse(sheetPath);

  // 1) Metadados reais da imagem (largura/altura da sheet)
  const sheetImage = sharp(sheetPath);
  const { width: sheetWidth, height: sheetHeight } = await sheetImage.metadata();

  if (!sheetWidth || !sheetHeight) {
    throw new Error('Não foi possível obter largura/altura da spritesheet.');
  }

  let frameWidth;
  let frameHeight;
  let frameCount;
  let videoFpsFromJson = null;
  let columns;
  let rows;

  // 2) Primeiro, tenta JSON (modo "perfeito")
  let metaFromJson = false;
  try {
    const meta = tryLoadSheetMetaJson(sheetPath);
    frameWidth = meta.frameWidth;
    frameHeight = meta.frameHeight;
    frameCount = meta.frameCount;
    videoFpsFromJson = meta.videoFps || null;
    metaFromJson = true;
  } catch (err) {
    console.warn(
      '[spritesheetToVideo] JSON não encontrado ou inválido, usando heurística:',
      err.message
    );
  }

  // 3) Se não tiver JSON, usa opções + heurísticas
  if (!metaFromJson) {
    const optFw =
      options.frameWidth && Number.isFinite(options.frameWidth)
        ? Math.max(1, Math.round(options.frameWidth))
        : null;
    const optFh =
      options.frameHeight && Number.isFinite(options.frameHeight)
        ? Math.max(1, Math.round(options.frameHeight))
        : null;
    const optCols =
      options.columns && Number.isFinite(options.columns)
        ? Math.max(1, Math.round(options.columns))
        : null;
    const optRows =
      options.rows && Number.isFinite(options.rows)
        ? Math.max(1, Math.round(options.rows))
        : null;
    const optCount =
      options.frameCount && Number.isFinite(options.frameCount)
        ? Math.max(1, Math.round(options.frameCount))
        : null;

    // 3.1 Se o usuário informar frameWidth/frameHeight, usamos direto
    if (optFw && optFh) {
      frameWidth = optFw;
      frameHeight = optFh;
    }
    // 3.2 Se ele informar só columns, assume frames quadrados em linha
    else if (optCols && !optRows) {
      frameWidth = Math.floor(sheetWidth / optCols);
      frameHeight = frameWidth;
    }
    // 3.3 Se informar só rows, assume frames quadrados em coluna
    else if (optRows && !optCols) {
      frameHeight = Math.floor(sheetHeight / optRows);
      frameWidth = frameHeight;
    }
    // 3.4 Caso não haja nenhuma dica, usa strip quadrada como fallback
    else {
      if (sheetWidth >= sheetHeight) {
        // strip horizontal: 1 linha, n colunas
        frameHeight = sheetHeight;
        frameWidth = sheetHeight;
      } else {
        // strip vertical: 1 coluna, n linhas
        frameWidth = sheetWidth;
        frameHeight = sheetWidth;
      }
    }

    if (!frameWidth || !frameHeight) {
      throw new Error(
        'Não foi possível inferir frameWidth/frameHeight da spritesheet.'
      );
    }

    columns = Math.floor(sheetWidth / frameWidth);
    rows = Math.floor(sheetHeight / frameHeight);

    if (columns <= 0 || rows <= 0) {
      throw new Error(
        `Dimensões incompatíveis entre sheet e frames (heurística). ` +
          `sheet=${sheetWidth}x${sheetHeight}, frame=${frameWidth}x${frameHeight}`
      );
    }

    const maxFrames = columns * rows;
    frameCount =
      optCount && optCount > 0 && optCount <= maxFrames
        ? optCount
        : maxFrames;
  } else {
    // metaFromJson == true
    columns = Math.floor(sheetWidth / frameWidth);
    rows = Math.floor(sheetHeight / frameHeight);

    if (columns <= 0 || rows <= 0) {
      throw new Error(
        `Dimensões incompatíveis entre sheet e frames. ` +
          `sheet=${sheetWidth}x${sheetHeight}, frame=${frameWidth}x${frameHeight}`
      );
    }

    const maxFrames = columns * rows;
    if (!frameCount || frameCount <= 0 || frameCount > maxFrames) {
      frameCount = maxFrames;
    }
  }

  // 4) FPS final: JSON > options > default 12
  const fpsOption =
    options.fps && Number.isFinite(options.fps) ? options.fps : null;
  const fps = videoFpsFromJson || fpsOption || 12;

  const cleanupFrames = options.cleanupFrames !== false;

  // Diretório onde vamos gerar temporariamente os frames e o vídeo final
  const outputDir = getOutputDirForKind('spritesheet-video');
  const framesDir = path.join(outputDir, `${parsed.name}_rebuild_frames`);

  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // 5) Extrai cada frame da grade, garantindo que nunca saia da imagem
  const extractPromises = [];
  for (let i = 0; i < frameCount; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    const left = col * frameWidth;
    const top = row * frameHeight;

    if (
      left < 0 ||
      top < 0 ||
      left + frameWidth > sheetWidth ||
      top + frameHeight > sheetHeight
    ) {
      console.warn(
        `[spritesheetToVideo] Ignorando frame fora dos limites: i=${i}, left=${left}, top=${top}`
      );
      continue;
    }

    const outPath = path.join(
      framesDir,
      `frame-${String(i).padStart(6, '0')}.png`
    );

    const p = sharp(sheetPath)
      .extract({
        left,
        top,
        width: frameWidth,
        height: frameHeight,
      })
      .toFile(outPath);

    extractPromises.push(p);
  }

  await Promise.all(extractPromises);

  const outputPath = path.join(outputDir, `${parsed.name}_rebuild.mp4`);

  // 6) Monta o vídeo com FFmpeg a partir da sequência de PNGs
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, 'frame-%06d.png'))
      .inputFPS(fps)
      .outputOptions(['-c:v libx264', '-pix_fmt yuv420p'])
      .on('error', (err) => {
        reject(new Error(`Erro no FFmpeg (sheet→vídeo): ${err.message}`));
      })
      .on('end', () => {
        resolve();
      })
      .save(outputPath);
  });

  if (cleanupFrames) {
    try {
      const files = fs.readdirSync(framesDir);
      for (const f of files) {
        fs.unlinkSync(path.join(framesDir, f));
      }
      fs.rmdirSync(framesDir);
    } catch (err) {
      console.warn(
        'Falha ao limpar frames temporários (spritesheet→vídeo):',
        err.message
      );
    }
  }

  return {
    videoPath: outputPath,
  };
}

module.exports = {
  spritesheetToVideo,
};
