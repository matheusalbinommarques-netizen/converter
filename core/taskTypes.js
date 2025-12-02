// core/taskTypes.js

/**
 * @typedef {'image' | 'video-mp3' | 'video-gif' | 'spritesheet' | 'video-spritesheet' | 'spritesheet-video'} ConversionKind
 */

/**
 * @typedef {'pending' | 'running' | 'completed' | 'failed'} ConversionStatus
 */

/**
 * Cria uma tarefa de conversão padronizada.
 *
 * @param {{ kind: ConversionKind, inputPaths: string[], options?: object }} params
 */
function createTask(params) {
  const { kind, inputPaths, options } = params;

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
