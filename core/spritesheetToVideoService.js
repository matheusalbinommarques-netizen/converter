// core/spritesheetToVideoService.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Lê metadados JSON gerados pelo spritesheet (do próprio app).
 * Usa: frameWidth, frameHeight, frameCount, videoFps (se tiver).
 */
function loadSheetMetaJson(sheetPath) {
  const parsed = path.parse(sheetPath);
  const metaPath = path.join(parsed.dir, `${parsed.name}.json`);

  if (!fs.existsSync(metaPath)) {
    throw new Error(
      `Arquivo de metadados JSON não encontrado para a spritesheet: ${metaPath}`
    );
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
 * Spritesheet (PNG + JSON) -> vídeo MP4
 */
async function spritesheetToVideo(sheetPath, options = {}) {
  if (!fs.existsSync(sheetPath)) {
    throw new Error(`Arquivo de spritesheet não encontrado: ${sheetPath}`);
  }

  const parsed = path.parse(sheetPath);
  const baseDir = parsed.dir;

  // 1) Metadados do JSON (tamanho de cada frame, contagem, FPS original)
  const jsonMeta = loadSheetMetaJson(sheetPath);
  const frameWidth = jsonMeta.frameWidth;
  const frameHeight = jsonMeta.frameHeight;
  let frameCount = jsonMeta.frameCount;

  // 2) Metadados reais do PNG (largura/altura da sheet)
  const sheetImage = sharp(sheetPath);
  const { width: sheetWidth, height: sheetHeight } = await sheetImage.metadata();

  if (!sheetWidth || !sheetHeight) {
    throw new Error('Não foi possível obter largura/altura da spritesheet PNG.');
  }

  const columns = Math.floor(sheetWidth / frameWidth);
  const rows = Math.floor(sheetHeight / frameHeight);

  if (columns <= 0 || rows <= 0) {
    throw new Error(
      `Dimensões incompatíveis entre sheet e frames. sheet=${sheetWidth}x${sheetHeight}, frame=${frameWidth}x${frameHeight}`
    );
  }

  const maxFrames = columns * rows;

  if (!frameCount || frameCount <= 0 || frameCount > maxFrames) {
    frameCount = maxFrames;
  }

  // FPS: usa o gravado no JSON; se não tiver, cai pro options ou 12
  const fpsFromJson = jsonMeta.videoFps;
  const fpsOption = options.fps && Number.isFinite(options.fps) ? options.fps : null;
  const fps =
    (fpsFromJson && Number.isFinite(fpsFromJson) && fpsFromJson) ||
    fpsOption ||
    12;

  const cleanupFrames = options.cleanupFrames !== false;

  const framesDir = path.join(baseDir, `${parsed.name}_rebuild_frames`);
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // 3) Extrai cada frame da grade, garantindo que nunca saia da imagem
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

  const outputPath = path.join(baseDir, `${parsed.name}_rebuild.mp4`);

  // 4) Monta o vídeo com FFmpeg a partir da sequência de PNGs
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(path.join(framesDir, 'frame-%06d.png'))
      .inputFPS(fps)
      .outputOptions([
        '-c:v libx264',
        '-pix_fmt yuv420p',
      ])
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
