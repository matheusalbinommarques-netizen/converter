// core/taskTypes.js

/**
 * Tipos de conversão suportados pela engine / QueueManager.
 *
 * - image              → imagem -> imagem (PNG/JPG/WebP etc.)
 * - video-mp3          → vídeo -> áudio (MP3/WAV)
 * - video-gif          → vídeo -> GIF
 * - spritesheet        → múltiplas imagens -> spritesheet (PNG + JSON)
 * - video-spritesheet  → vídeo -> spritesheet (PNG + JSON)
 * - spritesheet-video  → spritesheet (PNG + JSON) -> vídeo
 * - image-pdf          → uma ou várias imagens -> PDF
 * - pdf-image          → PDF -> uma imagem por página
 *
 * OBS:
 * - Para 'spritesheet' e 'image-pdf', normalmente usamos vários inputPaths.
 * - Para os demais kinds, em geral é 1 inputPath por task.
 *
 * @typedef {'image'
 *         | 'video-mp3'
 *         | 'video-gif'
 *         | 'spritesheet'
 *         | 'video-spritesheet'
 *         | 'spritesheet-video'
 *         | 'image-pdf'
 *         | 'pdf-image'
 * } ConversionKind
 */

/**
 * @typedef {'pending' | 'running' | 'completed' | 'failed'} ConversionStatus
 */

/**
 * Estrutura base de uma tarefa de conversão.
 *
 * @typedef {Object} ConversionTask
 * @property {string} id                - ID único da tarefa
 * @property {ConversionKind} kind      - Tipo de conversão
 * @property {string[]} inputPaths      - Arquivos de entrada
 * @property {object} options           - Opções específicas da conversão
 * @property {ConversionStatus} status  - Estado atual
 * @property {string[] | null} resultPaths - Arquivos de saída gerados
 * @property {string | null} errorMessage  - Mensagem de erro, se falhou
 */

/**
 * Cria uma tarefa de conversão padronizada.
 *
 * @param {{ kind: ConversionKind, inputPaths: string[], options?: object }} params
 * @returns {ConversionTask}
 */
function createTask(params) {
  const { kind, inputPaths, options } = params || {};

  if (!kind) {
    throw new Error('ConversionTask precisa de um "kind" válido.');
  }

  if (!Array.isArray(inputPaths) || inputPaths.length === 0) {
    throw new Error('ConversionTask precisa de pelo menos um inputPath.');
  }

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    inputPaths,
    options: options || {},
    status: 'pending',
    resultPaths: null,
    errorMessage: null,
  };
}

module.exports = {
  createTask,
};
