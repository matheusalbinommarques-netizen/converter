// core/pdfConversionService.js
// Conversões entre imagens e PDF usando GraphicsMagick (gm) + Ghostscript.
//
// Requisitos em runtime:
//  - gm.exe e demais DLLs em:   <projectRoot>/bin/win/gm
//  - gswin64c.exe em:          <projectRoot>/bin/win/gs
//
// O código abaixo injeta esses diretórios no PATH em tempo de execução,
// então não dependemos do PATH do Windows quando empacotar o app.

const fs = require('fs');
const path = require('path');
const gmLib = require('gm');
const { getOutputDirForKind } = require('../infra/outputService');

// ----------------------------------------------------------
// Ajuste de PATH para gm / gs (apenas Windows)
// ----------------------------------------------------------
const isWin = process.platform === 'win32';

if (isWin) {
  const projectRoot = path.resolve(__dirname, '..');

  const gmDirProject = path.join(projectRoot, 'bin', 'win', 'gm');
  const gsDirProject = path.join(projectRoot, 'bin', 'win', 'gs');

  // Possíveis instalações globais (se existirem, ótimo; senão ignoramos).
  const maybeGlobalDirs = [
    'C:\\Program Files\\GraphicsMagick-1.3.46-Q16',
    'C:\\Program Files (x86)\\GraphicsMagick-1.3.46-Q16',
    'C:\\Program Files\\gs\\gs10.04.0\\bin',
    'C:\\Program Files\\gs\\gs10.03.0\\bin',
  ];

  const extraDirs = [gmDirProject, gsDirProject, ...maybeGlobalDirs];

  const currentParts = (process.env.PATH || '').split(path.delimiter);

  const merged = [
    ...new Set(
      extraDirs
        .filter((d) => d && fs.existsSync(d))
        .concat(currentParts)
    ),
  ];

  process.env.PATH = merged.join(path.delimiter);
}

// Usaremos GraphicsMagick (não ImageMagick)
const gm = gmLib.subClass({ imageMagick: false });

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * IMAGENS → PDF
 *
 * @param {string[]} imagePaths
 * @param {{ outputDir?: string, outputName?: string }} options
 * @returns {Promise<string>} caminho do PDF gerado
 */
async function imagesToPdf(imagePaths, options = {}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    throw new Error('imagesToPdf: precisa de pelo menos 1 imagem.');
  }

  const outputDir = options.outputDir || getOutputDirForKind('image-pdf');
  ensureDir(outputDir);

  const firstBase = path.basename(
    imagePaths[0],
    path.extname(imagePaths[0])
  );
  const pdfName = (options.outputName || firstBase) + '.pdf';
  const pdfPath = path.join(outputDir, pdfName);

  // gm convert img1 img2 img3 ... out.pdf
  return new Promise((resolve, reject) => {
    let chain = gm().command('convert'); // modo multi-input

    for (const img of imagePaths) {
      chain = chain.in(img);
    }

    chain.write(pdfPath, (err) => {
      if (err) {
        return reject(new Error('Erro ao gerar PDF: ' + err.message));
      }
      resolve(pdfPath);
    });
  });
}

/**
 * PDF → IMAGENS
 *
 * Cria uma pasta com o mesmo nome do PDF e gera 1 imagem por página:
 *   <outputBase>/<nome_pdf>/<nome_pdf>_page-001.png
 *
 * @param {string} pdfPath
 * @param {{ imageFormat?: 'png' | 'jpg' | 'jpeg' | 'webp', dpi?: number, quality?: number, outputDir?: string }} options
 * @returns {Promise<string[]>} caminhos das imagens geradas
 */
async function pdfToImages(pdfPath, options = {}) {
  if (!pdfPath) {
    throw new Error('pdfToImages: caminho do PDF não informado.');
  }

  const imageFormat = options.imageFormat || 'png';
  const dpi = options.dpi || 150;
  const quality = options.quality ?? 90;

  // Pasta base (ex.: Downloads/Mídias convertidas/Imagens convertidas)
  const baseOutputDir =
    options.outputDir || getOutputDirForKind('pdf-image');

  // Pasta com o mesmo nome do PDF
  const pdfBase = path.basename(pdfPath, path.extname(pdfPath));
  const outputDir = path.join(baseOutputDir, pdfBase);
  ensureDir(outputDir);

  // 1) Descobrir número de páginas com "gm identify"
  const pageCount = await new Promise((resolve, reject) => {
    // %p retorna o número da página
    gm(pdfPath).identify('%p ', (err, data) => {
      if (err) {
        return reject(
          new Error(
            'Erro ao inspecionar PDF (identify): ' + err.message
          )
        );
      }

      const pages = String(data)
        .trim()
        .split(/\s+/)
        .map((x) => parseInt(x, 10))
        .filter((n) => Number.isFinite(n));

      const maxPage = pages.length ? Math.max(...pages) : 0;
      if (!maxPage) {
        return reject(
          new Error('Não foi possível detectar páginas do PDF.')
        );
      }

      resolve(maxPage);
    });
  });

  const imagePaths = [];

  // 2) Renderizar cada página
  for (let page = 0; page < pageCount; page++) {
    const outName = `${pdfBase}_page-${String(page + 1).padStart(
      3,
      '0'
    )}.${imageFormat}`;
    const outPath = path.join(outputDir, outName);

    // PDFs são 0-based no gm: file.pdf[0], file.pdf[1], ...
    const inputWithPage = `${pdfPath}[${page}]`;

    /* eslint-disable no-await-in-loop */
    await new Promise((resolve, reject) => {
      gm(inputWithPage)
        .density(dpi, dpi) // resolução
        .quality(quality) // para formatos com compressão
        .write(outPath, (err) => {
          if (err) {
            return reject(
              new Error(
                `Erro ao renderizar página ${page + 1} do PDF: ${
                  err.message
                }`
              )
            );
          }
          resolve();
        });
    });
    /* eslint-enable no-await-in-loop */

    imagePaths.push(outPath);
  }

  if (!imagePaths.length) {
    throw new Error('Nenhuma imagem foi gerada a partir do PDF.');
  }

  return imagePaths;
}

module.exports = {
  imagesToPdf,
  pdfToImages,
};
