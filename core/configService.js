// core/configService.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.converter');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// defaultConfig compatível com o que você já vinha usando nos testes
const defaultConfig = {
  version: 1,
  // estratégia de saída padrão:
  //  - "same-as-input" => na mesma pasta do arquivo original
  //  - "custom"        => usar customOutputDir
  outputDirMode: 'same-as-input',
  customOutputDir: '',
  defaultOutputDir: null,

  // preset mais recente usado (por tipo de conversão)
  // exemplo:
  // lastPreset: {
  //   kind: "image",
  //   options: { targetFormat: "webp", width: 1024, quality: 80 }
  // }
  lastPreset: null,
  lastPresetUpdatedAt: null,

  // último formato simples usado (ex: 'webp', 'png', etc.), caso queira
  lastFormat: null,
};

/**
 * Garante que a pasta de config existe.
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Carrega a config do usuário (ou defaults se não existir).
 */
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...defaultConfig };
    }
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultConfig, ...parsed };
  } catch (err) {
    console.warn('Falha ao ler config, usando defaults:', err.message);
    return { ...defaultConfig };
  }
}

/**
 * Salva a config no disco.
 */
function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

/**
 * Faz merge da config atual com um patch e salva.
 */
function updateConfig(patch) {
  const current = loadConfig();
  const next = { ...current, ...patch };
  saveConfig(next);
  return next;
}

/**
 * Lembra o último preset usado para um tipo de conversão.
 * Ex: rememberLastPreset("image", { targetFormat: "webp", width: 1024, quality: 80 })
 */
function rememberLastPreset(kind, options) {
  if (!kind) return;

  const current = loadConfig();

  const lastPreset = {
    kind,
    options: options || {},
  };

  const next = {
    ...current,
    lastPreset,
    lastPresetUpdatedAt: new Date().toISOString(),
  };

  saveConfig(next);
  return lastPreset;
}

/**
 * Retorna somente as options do último preset para o tipo informado,
 * ou null se não houver.
 *
 * Ex: getLastPreset("image") => { targetFormat: "webp", width: 1024, quality: 80 } | null
 */
function getLastPreset(kind) {
  if (!kind) return null;
  const config = loadConfig();
  const lp = config.lastPreset;

  if (!lp || typeof lp !== 'object') return null;
  if (lp.kind !== kind) return null;

  return lp.options || null;
}

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  loadConfig,
  saveConfig,
  updateConfig,
  rememberLastPreset,
  getLastPreset,
};
