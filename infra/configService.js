// infra/configService.js
//
// Serviço simples de configuração do usuário.
// Armazena um JSON no diretório do usuário (ex.: C:\Users\seuuser\.converter\config.json)
//
// Mantém:
// - Pasta padrão de saída (custom) ou "mesma pasta do arquivo de entrada" (apenas legado)
// - Último preset usado (kind + options)

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.converter');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

// Pasta Downloads do usuário (funciona em Windows/macOS/Linux, nome da pasta é "Downloads")
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

// Pasta padrão que o app vai usar quando o usuário ainda não configurou nada
// Ex.: C:\Users\<usuario>\Downloads\Imagens convertidas
const DEFAULT_OUTPUT_DIR = path.join(DOWNLOADS_DIR, 'Imagens convertidas');

const DEFAULT_CONFIG = {
  version: 1,
  // outputDirMode:
  //  - "same-as-input": legado, hoje preferimos criar uma pasta padrão do app
  //  - "custom": usa customOutputDir
  outputDirMode: 'same-as-input',
  customOutputDir: '',
  lastPreset: null,
  lastPresetUpdatedAt: null, // ISO string
};

function readConfigFromDisk() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG };
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (err) {
    console.warn('[ConfigService] Falha ao ler config, usando defaults:', err.message);
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfigToDisk(newConfig) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ConfigService] Falha ao salvar config:', err.message);
  }
}

function getConfig() {
  return readConfigFromDisk();
}

function updateConfig(patch) {
  const current = getConfig();
  const next = {
    ...current,
    ...patch,
  };
  writeConfigToDisk(next);
  return next;
}

function setOutputDirectory(mode, customDir) {
  const validModes = ['same-as-input', 'custom'];
  const finalMode = validModes.includes(mode) ? mode : 'same-as-input';

  const patch = {
    outputDirMode: finalMode,
  };

  if (finalMode === 'custom' && typeof customDir === 'string' && customDir.trim().length > 0) {
    patch.customOutputDir = customDir.trim();
  } else if (finalMode === 'same-as-input') {
    patch.customOutputDir = '';
  }

  return updateConfig(patch);
}

function rememberLastPreset(kind, options) {
  if (!kind) return;

  const cleanedOptions = {};
  if (options && typeof options === 'object') {
    for (const [key, value] of Object.entries(options)) {
      if (value !== undefined) {
        cleanedOptions[key] = value;
      }
    }
  }

  const patch = {
    lastPreset: {
      kind,
      options: cleanedOptions,
    },
    lastPresetUpdatedAt: new Date().toISOString(),
  };

  return updateConfig(patch);
}

function getLastPreset(kind) {
  if (!kind) return null;
  const cfg = getConfig();
  if (!cfg.lastPreset || typeof cfg.lastPreset !== 'object') return null;
  if (cfg.lastPreset.kind !== kind) return null;
  return cfg.lastPreset.options || null;
}

function ensureDirExists(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('[ConfigService] Falha ao criar pasta de saída:', err.message);
  }
}

/**
 * Resolve diretório de saída para um arquivo de entrada.
 *
 * Regras:
 * - Se o usuário já tiver configurado um customOutputDir (outputDirMode === "custom"),
 *   e não for o caminho antigo de dev (saidas-test), usa esse caminho.
 * - Caso contrário, o app usa:
 *     <home>/Downloads/Imagens convertidas
 *   cria essa pasta se não existir, grava na config e passa a usar sempre.
 */
function resolveOutputDirectory(inputPath) {
  const cfg = getConfig();

  // Detecta caminho antigo de dev (D:\...\converter\saidas-test) para poder migrar
  const isDevSaidasTest =
    typeof cfg.customOutputDir === 'string' &&
    cfg.customOutputDir.includes(path.join('converter', 'saidas-test'));

  // 1) Se já existe uma pasta custom válida e não é o "saidas-test", respeita
  if (
    cfg.outputDirMode === 'custom' &&
    typeof cfg.customOutputDir === 'string' &&
    cfg.customOutputDir.trim().length > 0 &&
    !isDevSaidasTest
  ) {
    const dir = cfg.customOutputDir.trim();
    ensureDirExists(dir);
    return dir;
  }

  // 2) Caso contrário, define a pasta padrão em Downloads/Imagens convertidas
  const dir = DEFAULT_OUTPUT_DIR;
  ensureDirExists(dir);

  // Atualiza config para passar a usar sempre essa pasta daqui pra frente
  updateConfig({
    outputDirMode: 'custom',
    customOutputDir: dir,
  });

  return dir;
}

// Alias com o nome antigo usado pelo QueueManager
function resolveOutputDir(inputPath) {
  return resolveOutputDirectory(inputPath);
}

module.exports = {
  CONFIG_DIR,
  CONFIG_PATH,
  DEFAULT_CONFIG,
  getConfig,
  updateConfig,
  setOutputDirectory,
  rememberLastPreset,
  getLastPreset,
  resolveOutputDirectory,
  resolveOutputDir,
};
