// core/pdfConversionService.js
// Regras de negócio para:
//   - IMAGENS -> PDF
//   - PDF -> IMAGENS
//
// Usa:
//   - pdf-lib  (montar PDF a partir de imagens)
//   - sharp    (normalizar imagens para PNG)
//   - pdf2pic  (rasterizar páginas de PDF em imagens)
//   - outputService (decidir pastas finais)

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { fromPath } = require('pdf2pic');
const {
  getOutputDirForKind,
  resolveOutputPath,
} = require('../infra/outputService');

// --- helpers internos ---

function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
}

function filterExisting(paths) {
  return (paths || []).filter((p) => p && fs.existsSync(p));
}

// ===================================================================
// IMAGENS -> PDF
// ===================================================================

/**
 * Converte várias imagens em UM único PDF (uma página por imagem).
 *
 * @param {string[]} imagePaths
 * @param {object} options
 *   - outputDir?: string   (opcional, se não vier usa outputService kind=image-pdf)
 *   - outputName?: string  (nome base do arquivo, sem .pdf)
 *
 * @returns {Promise<string>} caminho do PDF gerado
 */
async function imagesToPdf(imagePaths, options = {}) {
  const existing = filterExisting(imagePaths);
  if (!existing.length) {
    throw new Error('Nenhuma imagem válida encontrada para gerar PDF.');
  }

  const { outputDir, outputName } = options;

  const pdfDoc = await PDFDocument.create();

  for (const imgPath of existing) {
    // Converte tudo para PNG internamente, para evitar problema de formato
    const pngBuffer = await sharp(imgPath).png().toBuffer();
    const embedded = await pdfDoc.embedPng(pngBuffer);

    const { width, height } = embedded.size();
    const page = pdfDoc.addPage([width, height]);

    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();

  let finalDir = outputDir;
  if (!finalDir) {
    // Usa pasta padrão para 'image-pdf'
    finalDir = getOutputDirForKind('image-pdf');
  }
  ensureDir(finalDir);

  const baseInput = existing[0];
  const baseName = outputName
    ? outputName
    : path.basename(baseInput, path.extname(baseInput));

  const outPath = path.join(finalDir, `${baseName}.pdf`);
  fs.writeFileSync(outPath, pdfBytes);

  return outPath;
}

// ===================================================================
// PDF -> IMAGENS
// ===================================================================

/**
 * Converte TODAS as páginas de um PDF em imagens.
 * Cria uma pasta com o nome do PDF dentro de:
 *   Downloads/Mídias convertidas/Imagens convertidas/<NOME_DO_PDF>/
 *
 * @param {string} pdfPath
 * @param {object} options
 *   - imageFormat?: 'png' | 'jpg' | 'jpeg' (default: 'png')
 *   - dpi?: number (density para rasterização, default: 144)
 *   - quality?: number (para JPG, default: 90)
 *   - outputDir?: string (se quiser forçar um diretório específico)
 *
 * @returns {Promise<string[]>} lista de caminhos das imagens geradas
 */
async function pdfToImages(pdfPath, options = {}) {
  assertFileExists(pdfPath);

  let { imageFormat = 'png', dpi = 144, quality = 90, outputDir } = options;

  // Normaliza formato para algo que pdf2pic entenda
  imageFormat = (imageFormat || 'png').toLowerCase();
  if (imageFormat === 'jpeg') imageFormat = 'jpg';
  if (!['png', 'jpg'].includes(imageFormat)) {
    imageFormat = 'png';
  }

  if (!Number.isFinite(dpi) || dpi <= 0) dpi = 144;
  if (!Number.isFinite(quality) || quality <= 0 || quality > 100) {
    quality = 90;
  }

  const parsed = path.parse(pdfPath);
  const pdfBaseName = parsed.name;

  let finalOutputDir = outputDir;
  if (!finalOutputDir) {
    // Base: Downloads/Mídias convertidas/Imagens convertidas
    const baseImagesDir = getOutputDirForKind('pdf-image');
    // Subpasta com o nome do PDF
    finalOutputDir = path.join(baseImagesDir, pdfBaseName);
  }
  ensureDir(finalOutputDir);

  const optionsPdf2Pic = {
    density: dpi,
    format: imageFormat,
    quality,
    savePath: finalOutputDir,
    // nome base; pdf2pic vai gerar algo como <saveFilename>_1.png etc.
    saveFilename: pdfBaseName,
  };

  // Inicializa conversor a partir do caminho do PDF
  const converter = fromPath(pdfPath, optionsPdf2Pic);

  // bulk(-1, false) => todas as páginas, salvando em arquivo, retornando array de objetos
  const results = await converter.bulk(-1, false);

  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('Não foi possível converter o PDF em imagens.');
  }

  // Cada result costuma ter .path com o caminho final da imagem
  const imagePaths = results
    .map((r) => r && (r.path || r.dest || r.name))
    .filter(Boolean)
    .map((p) => path.resolve(p));

  if (!imagePaths.length) {
    throw new Error('PDF foi processado, mas nenhum arquivo de imagem foi encontrado.');
  }

  return imagePaths;
}

module.exports = {
  imagesToPdf,
  pdfToImages,
};
