// samples/test-image-conversion-advanced.js
const path = require('path');
const { convertImageWithOptions } = require('../core/conversionService');

async function main() {
  const inputArg = process.argv[2];
  const formatArg = process.argv[3];
  const widthArg = process.argv[4];
  const qualityArg = process.argv[5];

  if (!inputArg || !formatArg) {
    console.error('Uso:');
    console.error('  npm run test-convert-image-adv -- caminho/para/imagem.png formato [largura] [qualidade]');
    console.error('');
    console.error('Exemplos:');
    console.error('  npm run test-convert-image-adv -- "C:\\imagens\\foto.png" webp');
    console.error('  npm run test-convert-image-adv -- "C:\\imagens\\foto.png" jpg 800 85');
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const targetFormat = formatArg.toLowerCase();
  const width = widthArg ? Number(widthArg) : undefined;
  const quality = qualityArg ? Number(qualityArg) : undefined;

  try {
    console.log('Convertendo arquivo:', inputPath);
    console.log(`Formato alvo: ${targetFormat}`);
    if (width) console.log(`Largura: ${width}`);
    if (quality) console.log(`Qualidade: ${quality}`);

    const outputPath = await convertImageWithOptions(inputPath, {
      targetFormat,
      width,
      quality,
    });

    console.log('✅ Conversão concluída!');
    console.log('Arquivo gerado em:', outputPath);
  } catch (err) {
    console.error('❌ Erro na conversão:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
