// samples/test-video-conversion.js
const path = require('path');
const { extractAudioAsMp3 } = require('../core/videoConversionService');

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.error('Uso:');
    console.error('  npm run test-convert-video -- "Caminho/para/video.mp4"');
    console.error('');
    console.error('Exemplo:');
    console.error('  npm run test-convert-video -- "C:\\Videos\\clipe.mp4"');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);

  try {
    console.log('Convertendo vídeo para MP3...');
    console.log('Arquivo de entrada:', inputPath);

    const outputPath = await extractAudioAsMp3(inputPath);

    console.log('✅ Conversão concluída!');
    console.log('Arquivo MP3 gerado em:', outputPath);
  } catch (err) {
    console.error('❌ Erro na conversão:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
