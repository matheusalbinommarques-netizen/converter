// samples/test-config.js
const { loadConfig, updateConfig, CONFIG_FILE } = require('../core/configService');

function main() {
  console.log('Config atual:');
  console.log(loadConfig());

  console.log('\nAtualizando config (lastFormat, lastPreset)...');
  const updated = updateConfig({
    lastFormat: 'webp',
    lastPreset: 'GIF leve 480p 12fps',
  });

  console.log('\nConfig atualizada:');
  console.log(updated);

  console.log('\nArquivo de config salvo em:');
  console.log(CONFIG_FILE);
}

main();
