// infra/outputService.js
// Responsável por decidir ONDE salvar os arquivos gerados pelo conversor.
//
// Estrutura de pastas:
//
//   Downloads/
//     Mídias convertidas/
//       Imagens convertidas/
//       Gifs criados/
//       Vídeos e áudios criados/
//       Spritesheets criados/
//       Mídias diversas/   (fallback)

const fs = require('fs');
const path = require('path');
const os = require('os');

// Nome da pasta raiz dentro de Downloads
const BASE_FOLDER_NAME = 'Mídias convertidas';

/**
 * Garante que um diretório existe.
 */
function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Retorna a pasta raiz onde todas as mídias convertidas serão salvas.
 * Exemplo:
 *   C:\Users\mathe\Downloads\Mídias convertidas
 */
function getBaseOutputDir() {
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const baseDir = path.join(downloadsDir, BASE_FOLDER_NAME);
  ensureDir(baseDir);
  return baseDir;
}

/**
 * Dado o tipo de conversão (kind), retorna o nome da subpasta
 * dentro de "Mídias convertidas".
 *
 * Mapeamento combinado:
 * - image                → Imagens convertidas
 * - video-gif            → Gifs criados
 * - video-mp3            → Vídeos e áudios criados
 * - spritesheet          → Spritesheets criados
 * - video-spritesheet    → Spritesheets criados
 * - spritesheet-video    → Vídeos e áudios criados (gera vídeo)
 * - default / outros     → Mídias diversas
 */
function getSubfolderNameForKind(kind) {
  switch (kind) {
    case 'image':
      return 'Imagens convertidas';

    case 'video-gif':
      return 'Gifs criados';

    case 'video-mp3':
      return 'Vídeos e áudios criados';

    case 'spritesheet':
    case 'video-spritesheet':
      return 'Spritesheets criados';

    case 'spritesheet-video':
      return 'Vídeos e áudios criados';

    default:
      return 'Mídias diversas';
  }
}

/**
 * Retorna o diretório final (já com subpasta por tipo).
 * Exemplo:
 *   C:\Users\mathe\Downloads\Mídias convertidas\Spritesheets criados
 */
function getOutputDirForKind(kind) {
  const base = getBaseOutputDir();
  const subfolder = getSubfolderNameForKind(kind);
  const finalDir = path.join(base, subfolder);

  ensureDir(finalDir);
  return finalDir;
}

/**
 * Normaliza a extensão (com ponto).
 */
function normalizeExt(ext) {
  if (!ext) return '';
  if (ext.startsWith('.')) return ext;
  return '.' + ext;
}

/**
 * Gera um nome de arquivo de saída a partir do input, adicionando um sufixo opcional.
 * Ex.:
 *   input: "video.mp4", postfix: "gif", ext: ".gif"
 *   => "video_gif.gif"
 */
function buildOutputFileName(inputPath, postfix, ext) {
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const safeExt = normalizeExt(ext);
  const suffix = postfix ? `_${postfix}` : '';
  return baseName + suffix + safeExt;
}

/**
 * Função genérica para resolver o caminho final de saída.
 *
 * @param {Object} params
 *   - kind: tipo de conversão ("image", "video-gif", "video-mp3", "spritesheet", etc.)
 *   - inputPath: caminho do arquivo de entrada (para basear o nome)
 *   - extension: extensão de saída ("png", "gif", "mp4", "mp3", ...)
 *   - postfix: sufixo opcional para diferenciar (ex.: "sheet", "gif", "mp3")
 *
 * @returns {string} Caminho completo do arquivo de saída.
 */
function resolveOutputPath({ kind, inputPath, extension, postfix }) {
  if (!kind) {
    throw new Error('resolveOutputPath: "kind" é obrigatório.');
  }
  if (!inputPath) {
    throw new Error('resolveOutputPath: "inputPath" é obrigatório.');
  }

  const ext = normalizeExt(extension);
  const outputDir = getOutputDirForKind(kind);
  const fileName = buildOutputFileName(inputPath, postfix, ext);

  return path.join(outputDir, fileName);
}

/**
 * Função compatível com código mais antigo que só perguntava "qual diretório usar?".
 */
function resolveOutputDir(kind) {
  return getOutputDirForKind(kind);
}

module.exports = {
  getBaseOutputDir,
  getOutputDirForKind,
  resolveOutputDir,
  resolveOutputPath,
};
