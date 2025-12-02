// samples/test-spritesheet.js
const { buildSpritesheetFromImages } = require('../core/spriteService');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Uso:');
    console.error('  npm run test-spritesheet -- img1.png img2.png img3.png ...');
    console.error('');
    console.error('Exemplo:');
    console.error('  npm run test-spritesheet -- "C:\\imgs\\frame1.png" "C:\\imgs\\frame2.png"');
    process.exit(1);
  }

  try {
    console.log('Gerando spritesheet a partir de', args.length, 'imagens...');
    const { sheetPath, metaPath } = await buildSpritesheetFromImages(args, {
      // se quiser testar outra quantidade de colunas, pode adicionar aqui: columns: 4
    });

    console.log('✅ Spritesheet gerada com sucesso!');
    console.log('Imagem:', sheetPath);
    console.log('Metadados (JSON):', metaPath);
  } catch (err) {
    console.error('❌ Erro ao gerar spritesheet:');
    console.error(err.message);
    process.exit(1);
  }
}

main();
