// samples/test-mvp-conversions.js
// Pequena bateria de testes manuais/automáticos do MVP.
// Ele tenta rodar as conversões principais e loga SUCESSO / FALHA,
// pulando testes cujos arquivos de entrada não existirem.

const fs = require('fs');
const path = require('path');

const { convertImageWithOptions } = require('../core/conversionService');
const { extractAudioAsMp3 } = require('../core/videoConversionService');
const { videoToGif } = require('../core/gifConversionService');
const { videoToSpritesheet } = require('../core/videoSpritesheetService');
const { spritesheetToVideo } = require('../core/spritesheetToVideoService');

function exists(p) {
  return p && fs.existsSync(p);
}

function logTitle(title) {
  console.log('\n========================================');
  console.log(title);
  console.log('========================================');
}

async function runImageTests(baseDir) {
  logTitle('TESTES DE IMAGEM');

  const inputPng = path.join(baseDir, 'image-sample.png');
  const inputJpg = path.join(baseDir, 'image_sample.jpg');

  // PNG -> WebP
  if (exists(inputPng)) {
    try {
      const out = await convertImageWithOptions(inputPng, {
        kind: 'image', // ignorado internamente, mas deixo claro
        targetFormat: 'webp',
        width: 1024,
        quality: 80,
      });
      console.log('✓ PNG -> WebP OK:', out);
    } catch (err) {
      console.error('✗ PNG -> WebP FALHOU:', err.message);
    }
  } else {
    console.log('⚠ PNG -> WebP: pulado (samples/image-sample.png não existe)');
  }

  // JPG -> PNG
  if (exists(inputJpg)) {
    try {
      const out = await convertImageWithOptions(inputJpg, {
        targetFormat: 'png',
      });
      console.log('✓ JPG -> PNG OK:', out);
    } catch (err) {
      console.error('✗ JPG -> PNG FALHOU:', err.message);
    }
  } else {
    console.log('⚠ JPG -> PNG: pulado (samples/image-sample.jpg não existe)');
  }
}

async function runVideoMp3Tests(baseDir) {
  logTitle('TESTES DE VÍDEO -> MP3');

  const inputVideo = path.join(baseDir, 'video-sample.mp4');

  if (exists(inputVideo)) {
    try {
      const out = await extractAudioAsMp3(inputVideo);
      console.log('✓ MP4 -> MP3 OK:', out);
    } catch (err) {
      console.error('✗ MP4 -> MP3 FALHOU:', err.message);
    }
  } else {
    console.log('⚠ MP4 -> MP3: pulado (samples/video-sample.mp4 não existe)');
  }
}

async function runVideoGifTests(baseDir) {
  logTitle('TESTES DE VÍDEO -> GIF');

  const inputVideo = path.join(baseDir, 'video-sample.mp4');

  if (exists(inputVideo)) {
    try {
      const out = await videoToGif(inputVideo, {
        width: 480,
        fps: 12,
      });
      console.log('✓ MP4 -> GIF 480px 12fps OK:', out);
    } catch (err) {
      console.error('✗ MP4 -> GIF FALHOU:', err.message);
    }
  } else {
    console.log('⚠ MP4 -> GIF: pulado (samples/video-sample.mp4 não existe)');
  }
}

async function runVideoSpritesheetTests(baseDir) {
  logTitle('TESTES DE VÍDEO -> SPRITESHEET');

  const inputVideo = path.join(baseDir, 'video-sample.mp4');

  if (!exists(inputVideo)) {
    console.log(
      '⚠ Vídeo -> Spritesheet: pulado (samples/video-sample.mp4 não existe)'
    );
    return null;
  }

  try {
    const result = await videoToSpritesheet(inputVideo, {
      width: 480,
      columns: 8,
      outputName: 'video_sample_sheet',
    });

    console.log('✓ Vídeo -> Spritesheet OK:');
    console.log('  sheetPath:', result.sheetPath);
    console.log('  metaPath :', result.metaPath);

    return result;
  } catch (err) {
    console.error('✗ Vídeo -> Spritesheet FALHOU:', err.message);
    return null;
  }
}

async function runSpritesheetToVideoTests(baseDir, spriteResult) {
  logTitle('TESTES DE SPRITESHEET -> VÍDEO');

  // Se veio do teste anterior, ótimo; senão tentamos achar um padrão.
  let sheetPath =
    spriteResult && spriteResult.sheetPath
      ? spriteResult.sheetPath
      : null;

  if (!sheetPath) {
    const candidate = path.join(
      baseDir,
      'video_sample_sheet.png'
    );
    if (exists(candidate)) {
      sheetPath = candidate;
    }
  }

  if (!sheetPath || !exists(sheetPath)) {
    console.log(
      '⚠ Spritesheet -> Vídeo: pulado (não encontrei spritesheet gerada)'
    );
    return;
  }

  try {
    const { videoPath } = await spritesheetToVideo(sheetPath, {
      fps: 12,
    });
    console.log('✓ Spritesheet -> Vídeo OK:', videoPath);
  } catch (err) {
    console.error('✗ Spritesheet -> Vídeo FALHOU:', err.message);
  }
}

async function main() {
  const baseDir = path.join(__dirname, 'input');

  console.log('=== TESTES MVP – Conversor de Arquivos Universal ===');
  console.log('Base de samples:', baseDir);

  await runImageTests(baseDir);
  await runVideoMp3Tests(baseDir);
  await runVideoGifTests(baseDir);

  const spriteResult = await runVideoSpritesheetTests(baseDir);
  await runSpritesheetToVideoTests(baseDir, spriteResult);

  console.log('\n=== FIM DOS TESTES MVP ===');
}

main().catch((err) => {
  console.error('Erro inesperado nos testes:', err);
  process.exit(1);
});
