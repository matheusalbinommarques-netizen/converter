// core/videoConversionService.js
const fs = require('fs');
const path = require('path');
const { convertVideoToMp3 } = require('../infra/videoConverter');
const { getOutputDirForKind } = require('../infra/outputService');

/**
 * Regras de negócio para conversão de vídeo -> áudio.
 * Aqui podemos validar extensão de entrada, limites, etc.
 *
 * Saída padrão:
 *   Downloads/Mídias convertidas/Vídeos e áudios criados
 */
async function extractAudioAsMp3(inputPath, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo de entrada não encontrado: ${inputPath}`);
  }

  const ext = path.extname(inputPath).toLowerCase();
  const allowedInputs = ['.mp4', '.mkv', '.avi', '.mov', '.webm'];

  if (!allowedInputs.includes(ext)) {
    throw new Error(
      `Formato de entrada não suportado: ${ext}. Use um destes: ${allowedInputs.join(', ')}`
    );
  }

  const finalOutputDir = outputDir || getOutputDirForKind('video-mp3');

  const resultPath = await convertVideoToMp3(inputPath, finalOutputDir);
  return resultPath;
}

module.exports = {
  extractAudioAsMp3,
};
