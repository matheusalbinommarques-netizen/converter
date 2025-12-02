// samples/test-config.js
const path = require('path');
const {
  CONFIG_PATH,
  getConfig,
  updateConfig,
  rememberLastPreset,
  getLastPreset,
} = require('../infra/configService');

console.log('=== Teste de ConfigService (Fase 3) ===');
console.log('Arquivo de config:', CONFIG_PATH);

// 1) Ler config atual
console.log('\nConfig atual (antes):');
console.log(getConfig());

// 2) Configurar pasta de saída custom (exemplo)
updateConfig({
  outputDirMode: 'custom',
  customOutputDir: path.join(process.cwd(), 'saidas-test'),
});

console.log('\nConfig após updateConfig(outputDirMode/custom):');
console.log(getConfig());

// 3) Gravar um preset fake para "image"
rememberLastPreset('image', {
  targetFormat: 'webp',
  width: 1024,
  quality: 80,
  lixo: undefined, // deve ser ignorado
});

console.log('\nConfig após rememberLastPreset("image"):');
console.log(getConfig());

// 4) Testar getLastPreset
const presetImage = getLastPreset('image');
const presetVideoGif = getLastPreset('video-gif');

console.log('\ngetLastPreset("image") =>', presetImage);
console.log('getLastPreset("video-gif") =>', presetVideoGif);

console.log('\nOK – verifique se o arquivo foi criado e atualizado em:');
console.log(CONFIG_PATH);
