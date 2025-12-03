// infra/pdfConverter.js
// Conversões PDF ↔ imagens usando pdf-poppler.
// Atenção: exige que o binário "pdftoppm" (Poppler) esteja instalado e no PATH.

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-poppler');
const { getOutputDirForKind } = require('./outputService');

function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * PDF -> múltiplas imagens (uma por página).
 *
 * - Usa pdf-poppler (pdftoppm) em vez de sharp, pois sharp não lê PDF na build padrão.
 * - Todas as páginas vão para:
 *     Downloads/Mídias convertidas/Imagens convertidas/<NOME_DO_PDF>/
 *   Ex.:  1. Contexto, Problema e Oportunidade.pdf
 *         → .../Imagens convertidas/1. Contexto, Problema e Oportunidade/...
 *
 * options:
 *   - format: 'png' | 'jpg' | 'jpeg' (default: 'png')
 */
async function convertPdfToImages(pdfPath, options = {}) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`);
  }

  const ext = path.extname(pdfPath).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error(`Esperado um PDF, mas recebi: ${ext}`);
  }

  // Pasta base: .../Mídias convertidas/Imagens convertidas
  const imagensBaseDir = getOutputDirForKind('pdf-image');

  // Nome do PDF (sem extensão) vira nome da subpasta
  const pdfBaseName = path.basename(pdfPath, ext);
  const perPdfDir = path.join(imagensBaseDir, pdfBaseName);
  ensureDir(perPdfDir);

  // Formato de saída (por padrão PNG)
  const rawFormat = (options.format || 'png').toLowerCase();
  const format = rawFormat === 'jpeg' ? 'jpg' : rawFormat;

  const popplerOpts = {
    format,               // 'png' ou 'jpg'
    out_dir: perPdfDir,   // pasta destino
    out_prefix: pdfBaseName, // prefixo dos arquivos gerados
    // se quiser, dá pra adicionar 'page' para uma página específica
  };

  // pdf-poppler gera os arquivos no disco (página por página)
  await pdf.convert(pdfPath, popplerOpts);

  // Coletar as imagens geradas (ex.: "1. Contexto...-1.png", "-2.png", etc.)
  const allFiles = fs
    .readdirSync(perPdfDir)
    .filter((name) =>
      name.toLowerCase().endsWith(`.${format}`) &&
      name.startsWith(pdfBaseName)
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );

  const pagePaths = allFiles.map((f) => path.join(perPdfDir, f));

  if (!pagePaths.length) {
    throw new Error(
      'Nenhuma página foi gerada a partir do PDF. ' +
        'Verifique se o "pdftoppm" (Poppler) está instalado e no PATH.'
    );
  }

  return {
    outputDir: perPdfDir,
    pagePaths,
  };
}

module.exports = {
  convertPdfToImages,
};
