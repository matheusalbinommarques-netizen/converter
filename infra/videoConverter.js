// infra/videoConverter.js
// Conversões de vídeo (→ áudio, → GIF, extração de frames) usando ffmpeg.
// Integrado com outputService para salvar em:
//   Downloads/Mídias convertidas/...

const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const { getOutputDirForKind } = require('./outputService');

// --- Configura o binário do ffmpeg / ffprobe ---
// ffmpeg-static às vezes exporta string, às vezes objeto.
let ffmpegBin = ffmpegStatic;
if (ffmpegBin && typeof ffmpegBin === 'object' && ffmpegBin.path) {
  ffmpegBin = ffmpegBin.path;
}

if (ffmpegBin) {
  ffmpeg.setFfmpegPath(ffmpegBin);
} else {
  console.warn(
    '[videoConverter] ffmpeg-static não encontrado, usando ffmpeg do sistema (se estiver no PATH).'
  );
}

if (ffprobeStatic && ffprobeStatic.path) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
} else {
  console.warn(
    '[videoConverter] ffprobe-static não encontrado, usando ffprobe do sistema (se estiver no PATH).'
  );
}

/**
 * Garante que o input existe.
 */
function assertInputExists(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }
}

/**
 * Garante que o vídeo tem pelo menos uma trilha de áudio.
 * Se não tiver, lança um erro amigável.
 */
async function ensureHasAudioStream(inputPath) {
  const meta = await ffprobePromise(inputPath);
  const hasAudio =
    meta &&
    Array.isArray(meta.streams) &&
    meta.streams.some((s) => s.codec_type === 'audio');

  if (!hasAudio) {
    throw new Error('Este vídeo não possui nenhuma trilha de áudio para extrair.');
  }
}

/**
 * Vídeo -> MP3.
 *
 * Se outputDir não for passado, usa:
 *   Downloads/Mídias convertidas/Videos e audios criados
 *
 * Para evitar problemas de caminho (acentos) com ffmpeg-static em Windows,
 * gravamos primeiro em um caminho temporário (ASCII) e depois movemos
 * o arquivo final via Node.
 */
async function convertVideoToMp3(inputPath, outputDir) {
  assertInputExists(inputPath);
  await ensureHasAudioStream(inputPath);

  const finalOutputDir = outputDir || getOutputDirForKind('video-mp3');

  const parsed = path.parse(inputPath);
  const finalOutPath = path.join(finalOutputDir, `${parsed.name}.mp3`);

  // Caminho temporário seguro (ASCII) em os.tmpdir()
  const tmpDir = os.tmpdir();
  const tmpOutPath = path.join(
    tmpDir,
    `converter_audio_${Date.now()}_${Math.random().toString(16).slice(2)}.mp3`
  );

  // Garante que a pasta de saída final existe
  if (!fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }

  // Remove sobra antiga no tmp, se existir
  try {
    if (fs.existsSync(tmpOutPath)) {
      fs.unlinkSync(tmpOutPath);
    }
  } catch {
    // ignora
  }

  await new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .format('mp3')
      .output(tmpOutPath)
      .on('error', (err) => {
        // tenta limpar o tmp se der erro
        try {
          if (fs.existsSync(tmpOutPath)) {
            fs.unlinkSync(tmpOutPath);
          }
        } catch {
          /* ignore */
        }
        reject(
          new Error(`Erro ao converter vídeo para MP3: ${err.message}`)
        );
      })
      .on('end', () => {
        resolve();
      });

    cmd.run();
  });

  // Move do tmp para o destino final (com acentos, etc.)
  try {
    if (fs.existsSync(finalOutPath)) {
      fs.unlinkSync(finalOutPath);
    }
  } catch {
    // se não conseguir apagar, vamos tentar sobrescrever mesmo assim
  }

  fs.renameSync(tmpOutPath, finalOutPath);

  return finalOutPath;
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

  if (!fs.existsSync(finalOutputDir)) {
    fs.mkdirSync(finalOutputDir, { recursive: true });
  }

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
    const cmd = ffmpeg(inputPath).output(outPath);

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
      .run();
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
  const baseFramesDirRoot =
    outputDir || getOutputDirForKind('video-spritesheet');
  const framesDir = path.join(baseFramesDirRoot, `${parsed.name}_frames`);

  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  const inputMetadata = await ffprobePromise(inputPath);
  const totalFrames = estimateTotalFrames(inputMetadata);
  if (totalFrames) {
    console.log(
      `[extractAllFramesToPngs] Estimativa de frames para ${inputPath}: ~${totalFrames}`
    );
  }

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
  const duration =
    meta.format && meta.format.duration
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
