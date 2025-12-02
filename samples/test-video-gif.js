// samples/test-video-gif.js
const path = require('path');
const { videoToGif } = require('../core/gifConversionService');

async function main() {
  const inputArg = process.argv[2];
  const widthArg = process.argv[3];
  const fpsArg = process.argv[4];

  if (!inputArg) {
    console.error('Uso:');
    console.error('  npm run test-video-gif -- "Caminho/para/video.mp4" [largura] [fps]');
    console.error('');
    console.error('Exemplos:');
    console.error('  npm run test-video-gif -- "C:\\Videos\\clipe.mp4"');
    console.error('  npm run test-video-gif -- "C:\\Videos\\clipe.mp4" 480 12');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const width = widthArg ? Number(widthArg) : undefined;
  const fps = fpsArg ? Number(fpsArg) : undefined;

  try {
    console.log('Gerando GIF a partir do vídeo...');
    console.log('Arquivo de entrada:', inputPath);
    if (width) console.log('Largura:', width);
    if (fps) console.log('FPS:', fps);

    const outputPath = await videoToGif(inputPath, { width, fps });

    console.log('✅ GIF gerado com sucesso!');
    console.log('Arquivo GIF:', outputPath);
  } catch (err) {
    console.error('❌ Erro na conversão para GIF:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
