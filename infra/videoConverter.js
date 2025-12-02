// infra/videoConverter.js
// Conversões de vídeo (→ MP3, → GIF, extração de frames) usando ffmpeg + sharp.
// Integrado com outputService para salvar em:
//   Downloads/Mídias convertidas/...

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { getOutputDirForKind } = require('./outputService');

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Garante que o input existe.
 */
function assertInputExists(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }
}

/**
 * Vídeo -> MP3
 * Se outputDir não for passado, usa:
 *   Downloads/Mídias convertidas/Vídeos e áudios criados
 */
async function convertVideoToMp3(inputPath, outputDir) {
  assertInputExists(inputPath);

  const finalOutputDir = outputDir || getOutputDirForKind('video-mp3');

  const parsed = path.parse(inputPath);
  const outPath = path.join(finalOutputDir, `${parsed.name}.mp3`);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('error', (err) => {
        reject(new Error(`Erro ao converter vídeo para MP3: ${err.message}`));
      })
      .on('end', () => {
        resolve();
      })
      .save(outPath);
  });

  return outPath;
}

/**
 * Vídeo -> GIF
 * options:
 *   - width: px (opcional)
 *   - fps: frames/s (opcional)
 *   - outputDir: opcional
 *
 * Se outputDir não for passado, usa:
 *   Downloads/Mídias convertidas/Gifs criados
 */
async function convertVideoToGif(inputPath, options = {}) {
  assertInputExists(inputPath);

  const { width, fps, outputDir } = options;

  const finalOutputDir = outputDir || getOutputDirForKind('video-gif');

  const parsed = path.parse(inputPath);
  const outPath = path.join(finalOutputDir, `${parsed.name}.gif`);

  const filters = [];

  if (width && Number.isFinite(width)) {
    const w = Math.max(16, Math.round(width));
    filters.push(`scale=${w}:-1:flags=lanczos`);
  }

  if (fps && Number.isFinite(fps)) {
    const f = Math.max(1, Math.round(fps));
    filters.push(`fps=${f}`);
  }

  await new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath);

    if (filters.length > 0) {
      cmd.videoFilters(filters.join(','));
    }

    cmd
      .outputOptions([
        '-loop 0', // loop infinito
      ])
      .on('error', (err) => {
        reject(new Error(`Erro ao converter vídeo para GIF: ${err.message}`));
      })
      .on('end', () => {
        resolve();
      })
      .save(outPath);
  });

  return outPath;
}

/**
 * Extrai TODOS os frames de um vídeo em PNG.
 *
 * options:
 *   - width: px opcional (redimensiona mantendo proporção)
 *   - outputDir: diretório onde ficarão os frames
 *
 * Se outputDir não for passado, usa:
 *   Downloads/Mídias convertidas/Spritesheets criados/<nome>_frames
 */
async function extractAllFramesToPngs(inputPath, options = {}) {
  assertInputExists(inputPath);

  const { width, outputDir } = options;

  const parsed = path.parse(inputPath);
  const baseFramesDirRoot = outputDir || getOutputDirForKind('video-spritesheet');
  const framesDir = path.join(baseFramesDirRoot, `${parsed.name}_frames`);

  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const inputMetadata = await ffprobePromise(inputPath);
  const totalFrames = estimateTotalFrames(inputMetadata);

  const pattern = path.join(framesDir, 'frame-%06d.png');

  await new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath).output(pattern);

    if (width && Number.isFinite(width)) {
      const w = Math.max(16, Math.round(width));
      cmd.videoFilters(`scale=${w}:-1:flags=lanczos`);
    }

    cmd
      .on('error', (err) => {
        reject(new Error(`Erro ao extrair frames de vídeo: ${err.message}`));
      })
      .on('end', () => {
        resolve();
      })
      .run();
  });

  // Coleta todos os frames gerados
  const files = fs
    .readdirSync(framesDir)
    .filter((f) => /^frame-\d+\.png$/.test(f))
    .sort();

  const framePaths = files.map((f) => path.join(framesDir, f));

  if (!framePaths.length) {
    throw new Error('Nenhum frame PNG foi gerado a partir do vídeo.');
  }

  return framePaths;
}

/**
 * Obtém FPS aproximado do vídeo usando ffprobe.
 */
async function getVideoFps(inputPath) {
  assertInputExists(inputPath);

  const meta = await ffprobePromise(inputPath);
  return extractFpsFromMeta(meta);
}

/**
 * Helper: ffprobe em Promise.
 */
function ffprobePromise(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Extrai FPS de metadados do ffprobe.
 */
function extractFpsFromMeta(meta) {
  if (!meta || !meta.streams) return null;
  const videoStream = meta.streams.find((s) => s.codec_type === 'video');
  if (!videoStream) return null;

  // Tenta r_frame_rate ou avg_frame_rate (formato "30000/1001", etc.)
  const rateStr = videoStream.r_frame_rate || videoStream.avg_frame_rate;
  if (!rateStr || rateStr === '0/0') return null;

  const [numStr, denStr] = rateStr.split('/');
  const num = Number(numStr);
  const den = Number(denStr || 1);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    return null;
  }

  const fps = num / den;
  return fps && fps > 0 ? fps : null;
}

/**
 * Tenta estimar número total de frames (opcional, usado só pra debug/estatística).
 */
function estimateTotalFrames(meta) {
  const fps = extractFpsFromMeta(meta);
  const duration = meta.format && meta.format.duration
    ? Number(meta.format.duration)
    : null;

  if (!fps || !duration) return null;
  return Math.round(fps * duration);
}

module.exports = {
  convertVideoToMp3,
  convertVideoToGif,
  extractAllFramesToPngs,
  getVideoFps,
};
