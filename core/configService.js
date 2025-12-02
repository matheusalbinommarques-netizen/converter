// core/configService.js
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.converter');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const defaultConfig = {
  defaultOutputDir: null,
  lastPreset: null,
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

module.exports = {
  CONFIG_DIR,
  CONFIG_FILE,
  loadConfig,
  saveConfig,
  updateConfig,
};
