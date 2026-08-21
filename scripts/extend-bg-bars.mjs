/**
 * Preenche barras laterais residuais (letterbox/pillarbox que o cropdetect
 * não removeu) dos frames 7-22 do hero.
 *
 * Estratégia per-row "bg extension":
 *   1. Amostra cor do fundo numa região "limpa" no topo-centro do frame.
 *   2. Pra cada coluna, calcula a média RGB das primeiras N linhas (topo) —
 *      acima do tênis, então é só barra ou bg puro.
 *   3. Coluna é "barra" quando sua média top-rows difere do bg de
 *      referência por mais que THRESHOLD.
 *   4. Pra cada linha y, pinta as colunas-barra da esquerda usando a média
 *      de uma fatia logo dentro da borda (cols [leftEnd, leftEnd+SAMPLE_W]).
 *      O fill herda o gradiente natural daquela linha — sem seam visível.
 *      Mesma coisa pra direita.
 *
 * Roda direto: node scripts/extend-bg-bars.mjs [start] [end]
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Desabilita o cache do libvips — em alguns builds 0.34 + Windows ele segura
// handles entre invocações e quebra a próxima leitura com "UNKNOWN open".
sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const PREFIX = "jordan1";

// Parse CLI: [start] [end] [--left N] [--right N]
// --left/--right bypassam a detecção e pintam exatamente N px no lado.
// Use 0 pra desligar o lado completamente.
const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v];
    }),
);
// Suporta --left N (space-separated) também
for (let i = 0; i < args.length - 1; i++) {
  if (args[i] === "--left") flags.left = args[i + 1];
  if (args[i] === "--right") flags.right = args[i + 1];
}

const START = Number(positional[0] ?? 7);
const END = Number(positional[1] ?? 22);
const FORCE_LEFT = flags.left !== undefined ? Number(flags.left) : null;
const FORCE_RIGHT = flags.right !== undefined ? Number(flags.right) : null;

const TOP_ROWS_FOR_DETECTION = 16; // rows usados pra decidir "isto é barra?"
const SAMPLE_W = 6;                // fatia logo dentro da borda usada como cor de pintura
const THRESHOLD = 14;              // distância RGB mínima pra classificar coluna como barra
const MAX_BAR_RATIO = 0.3;         // segurança: nunca pinta mais que 30% por lado

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function processFrame(idx) {
  const filename = `${PREFIX}-${String(idx).padStart(3, "0")}.webp`;
  const filePath = path.join(FRAMES_DIR, filename);
  const backupPath = path.join(FRAMES_DIR, `.bak-${filename}`);

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return { filename, status: "missing" };
  }

  // Backup once (não sobrescreve se já existe)
  try {
    await fs.access(backupPath);
  } catch {
    await fs.copyFile(filePath, backupPath);
  }

  // Lê o arquivo direto em buffer ANTES de passar pra sharp — assim a abertura
  // do arquivo é feita pelo Node (não pelo libvips), evitando o "UNKNOWN open"
  // intermitente observado em builds 0.34 + Windows + Node 25.
  const fileBuf = await fs.readFile(filePath);

  const { data, info } = await sharp(fileBuf)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 3) {
    return { filename, status: "skip-channels", channels };
  }

  const out = Buffer.from(data);

  // 1. Sampling bg de referência: faixa de topo-centro (cols 40-60% width, rows 2-10)
  const bgX1 = Math.floor(width * 0.4);
  const bgX2 = Math.floor(width * 0.6);
  let bgR = 0, bgG = 0, bgB = 0, bgN = 0;
  for (let y = 2; y < 10; y++) {
    for (let x = bgX1; x < bgX2; x++) {
      const i = (y * width + x) * 3;
      bgR += data[i]; bgG += data[i + 1]; bgB += data[i + 2];
      bgN++;
    }
  }
  bgR /= bgN; bgG /= bgN; bgB /= bgN;

  // 2. Coluna mean nos TOP_ROWS_FOR_DETECTION primeiros rows
  const colMeans = new Array(width);
  for (let x = 0; x < width; x++) {
    let r = 0, g = 0, b = 0;
    for (let y = 1; y < 1 + TOP_ROWS_FOR_DETECTION; y++) {
      const i = (y * width + x) * 3;
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    colMeans[x] = [
      r / TOP_ROWS_FOR_DETECTION,
      g / TOP_ROWS_FOR_DETECTION,
      b / TOP_ROWS_FOR_DETECTION,
    ];
  }

  // 3. Detecta fronteiras das barras (ou usa overrides via --left / --right).
  const maxBarPx = Math.floor(width * MAX_BAR_RATIO);

  let leftEnd;
  if (FORCE_LEFT !== null) {
    leftEnd = FORCE_LEFT;
  } else {
    leftEnd = 0;
    while (
      leftEnd < maxBarPx &&
      colorDist(colMeans[leftEnd][0], colMeans[leftEnd][1], colMeans[leftEnd][2], bgR, bgG, bgB) > THRESHOLD
    ) {
      leftEnd++;
    }
  }

  let rightStart;
  if (FORCE_RIGHT !== null) {
    rightStart = width - FORCE_RIGHT;
  } else {
    rightStart = width;
    let scan = width - 1;
    while (
      scan >= width - maxBarPx &&
      colorDist(colMeans[scan][0], colMeans[scan][1], colMeans[scan][2], bgR, bgG, bgB) > THRESHOLD
    ) {
      rightStart = scan;
      scan--;
    }
  }

  if (leftEnd === 0 && rightStart === width) {
    return {
      filename,
      status: "no-bars",
      bg: [bgR | 0, bgG | 0, bgB | 0],
    };
  }

  // 4. Pinta. Per-row, usa fatia logo dentro da borda como cor de pintura.
  if (leftEnd > 0) {
    const sliceStart = leftEnd;
    const sliceEnd = Math.min(width, leftEnd + SAMPLE_W);
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0;
      for (let x = sliceStart; x < sliceEnd; x++) {
        const i = (y * width + x) * 3;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
      }
      const n = sliceEnd - sliceStart;
      const rr = Math.round(r / n);
      const gg = Math.round(g / n);
      const bb = Math.round(b / n);
      for (let x = 0; x < leftEnd; x++) {
        const i = (y * width + x) * 3;
        out[i] = rr; out[i + 1] = gg; out[i + 2] = bb;
      }
    }
  }

  if (rightStart < width) {
    const sliceEnd = rightStart;
    const sliceStart = Math.max(0, rightStart - SAMPLE_W);
    for (let y = 0; y < height; y++) {
      let r = 0, g = 0, b = 0;
      for (let x = sliceStart; x < sliceEnd; x++) {
        const i = (y * width + x) * 3;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
      }
      const n = sliceEnd - sliceStart;
      const rr = Math.round(r / n);
      const gg = Math.round(g / n);
      const bb = Math.round(b / n);
      for (let x = rightStart; x < width; x++) {
        const i = (y * width + x) * 3;
        out[i] = rr; out[i + 1] = gg; out[i + 2] = bb;
      }
    }
  }

  // 5. Encoda e sobrescreve direto. Evita fs.rename, que falha com EPERM no
  //    Windows quando o file watcher do Next dev tem handle de leitura ativo
  //    no destino — writeFile com OVERWRITE_EXISTING passa por essa proteção.
  const webpBuf = await sharp(out, { raw: { width, height, channels: 3 } })
    .webp({ quality: 88, effort: 6 })
    .toBuffer();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.writeFile(filePath, webpBuf);
      break;
    } catch (err) {
      if (attempt === 4 || (err.code !== "EPERM" && err.code !== "EBUSY")) throw err;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  return {
    filename,
    status: "fixed",
    leftBar: leftEnd,
    rightBar: width - rightStart,
    width,
    bg: [bgR | 0, bgG | 0, bgB | 0],
  };
}

async function main() {
  console.log(`fixing bars in ${PREFIX}-${String(START).padStart(3, "0")}..${String(END).padStart(3, "0")}.webp`);
  const mode = [];
  if (FORCE_LEFT !== null) mode.push(`force-left=${FORCE_LEFT}px`);
  if (FORCE_RIGHT !== null) mode.push(`force-right=${FORCE_RIGHT}px`);
  if (mode.length === 0) mode.push(`auto-detect threshold=${THRESHOLD}`);
  console.log(`${mode.join("  ")}  sample-w=${SAMPLE_W}\n`);

  for (let i = START; i <= END; i++) {
    try {
      const r = await processFrame(i);
      if (r.status === "fixed") {
        console.log(
          `  ${r.filename}: bg=(${r.bg.join(",")})  left=${r.leftBar}px  right=${r.rightBar}px  (of ${r.width})`,
        );
      } else if (r.status === "no-bars") {
        console.log(`  ${r.filename}: no bars detected (bg=${r.bg.join(",")})`);
      } else {
        console.log(`  ${r.filename}: ${r.status}`);
      }
    } catch (err) {
      console.error(`  frame ${i}: ERROR — ${err.message}`);
    }
  }

  console.log(`\ndone. backups em ${FRAMES_DIR}/.bak-${PREFIX}-NNN.webp`);
}

main();
