// infra/configService.js
//
// Serviço simples de configuração do usuário.
// Armazena um JSON no home do usuário (ex.: C:\Users\seuuser\.universal-converter-config.json)
//
// Mantém:
// - Pasta padrão de saída (custom) ou "mesma pasta do arquivo de entrada"
// - Último preset usado (kind + options)
// - Outras preferências simples no futuro

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE_NAME = '.universal-converter-config.json';
const CONFIG_PATH = path.join(os.homedir(), CONFIG_FILE_NAME);

const DEFAULT_CONFIG = {
  version: 1,
  // outputDirMode:
  //  - "same-as-input": salva na mesma pasta do arquivo original
  //  - "custom": usa customOutputDir
  outputDirMode: 'same-as-input',
  customOutputDir: '',
  // Último preset usado na UI (tipo de conversão + opções)
  lastPreset: null, // { kind: string, options: object }
  lastPresetUpdatedAt: null, // ISO string
};

/**
 * Lê o arquivo de configuração do disco.
 * Se não existir ou estiver inválido, retorna DEFAULT_CONFIG.
 */
function readConfigFromDisk() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { ...DEFAULT_CONFIG };
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    // Merge com defaults, para garantir campos novos
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch (err) {
    console.warn('[ConfigService] Falha ao ler config, usando defaults:', err.message);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Escreve a configuração no disco (merge com a atual).
 */
function writeConfigToDisk(newConfig) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ConfigService] Falha ao salvar config:', err.message);
  }
}

/**
 * Retorna a configuração atual (já mergeada com defaults).
 */
function getConfig() {
  return readConfigFromDisk();
}

/**
 * Atualiza a configuração parcialmente.
 * Exemplo:
 *   updateConfig({ outputDirMode: 'custom', customOutputDir: 'D:/Saidas' })
 */
function updateConfig(partial) {
  const current = readConfigFromDisk();
  const merged = {
    ...current,
    ...partial,
  };
  writeConfigToDisk(merged);
  return merged;
}

/**
 * Define a pasta padrão de saída.
 *  - mode = "same-as-input" | "custom"
 *  - customDir só é usado quando mode === "custom"
 */
function setOutputDirectory(mode, customDir) {
  const safeMode =
    mode === 'custom' || mode === 'same-as-input' ? mode : 'same-as-input';

  const trimmed =
    typeof customDir === 'string' ? customDir.trim() : '';

  return updateConfig({
    outputDirMode: safeMode,
    customOutputDir: trimmed,
  });
}

/**
 * Lembra o último preset usado (tipo de conversão + opções).
 * Ex.: rememberLastPreset('image', { targetFormat: 'webp', width: 1024, quality: 80 })
 */
function rememberLastPreset(kind, options) {
  const now = new Date().toISOString();
  return updateConfig({
    lastPreset: {
      kind,
      options: options || {},
    },
    lastPresetUpdatedAt: now,
  });
}

/**
 * Decide a pasta de saída com base:
 *  - em um outputDir explícito (se for passado),
 *  - ou na configuração do usuário,
 *  - ou, no fallback, na pasta do arquivo de entrada.
 *
 * @param {string} inputDir - pasta do arquivo de entrada
 * @param {string | undefined} explicitOutputDir - pasta passada explicitamente pelo chamador
 */
function resolveOutputDir(inputDir, explicitOutputDir) {
  if (explicitOutputDir && explicitOutputDir.trim().length > 0) {
    return explicitOutputDir;
  }

  const cfg = getConfig();

  if (
    cfg.outputDirMode === 'custom' &&
    cfg.customOutputDir &&
    cfg.customOutputDir.trim().length > 0
  ) {
    return cfg.customOutputDir.trim();
  }

  // fallback: mesma pasta do arquivo de entrada
  return inputDir;
}

module.exports = {
  CONFIG_PATH,
  getConfig,
  updateConfig,
  setOutputDirectory,
  rememberLastPreset,
  resolveOutputDir,
};
