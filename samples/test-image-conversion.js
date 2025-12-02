// samples/test-image-conversion.js
const path = require('path');
const { convertPngToJpeg } = require('../core/conversionService');

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    console.error('Uso:');
    console.error('  npm run test-convert-image -- caminho/para/imagem.png');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);

  try {
    console.log('Convertendo arquivo:', inputPath);
    const outputPath = await convertPngToJpeg(inputPath);
    console.log('✅ Conversão concluída!');
    console.log('Arquivo gerado em:', outputPath);
  } catch (err) {
    console.error('❌ Erro na conversão:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
