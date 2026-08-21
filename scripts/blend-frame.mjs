/**
 * Substitui um frame pelo blend pixel-a-pixel de dois vizinhos.
 * Uso pra quebrar spikes de descontinuidade temporal do Veo 3.
 *
 *   node scripts/blend-frame.mjs <target> <a> <b> [--weight 0.5]
 *
 * Exemplo:
 *   node scripts/blend-frame.mjs 14 13 15            # média 50/50 de 13 e 15 → 14
 *   node scripts/blend-frame.mjs 14 13 15 --weight 0.6  # 60% de 13, 40% de 15
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const PREFIX = "jordan1";

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const TARGET = Number(positional[0]);
const A = Number(positional[1]);
const B = Number(positional[2]);

let weight = 0.5;
for (let i = 0; i < args.length - 1; i++) {
  if (args[i] === "--weight") weight = Number(args[i + 1]);
}

if (!Number.isFinite(TARGET) || !Number.isFinite(A) || !Number.isFinite(B)) {
  console.error("uso: node scripts/blend-frame.mjs <target> <a> <b> [--weight 0.5]");
  process.exit(1);
}

function framePath(i) {
  return path.join(FRAMES_DIR, `${PREFIX}-${String(i).padStart(3, "0")}.webp`);
}

async function loadRaw(i) {
  const buf = await fs.readFile(framePath(i));
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function main() {
  console.log(`blend: ${PREFIX}-${String(TARGET).padStart(3, "0")} = ${weight} * ${A} + ${(1 - weight).toFixed(2)} * ${B}`);

  const a = await loadRaw(A);
  const b = await loadRaw(B);

  if (a.data.length !== b.data.length || a.info.width !== b.info.width || a.info.height !== b.info.height) {
    throw new Error("frames A and B differ in dimensions");
  }

  const out = Buffer.alloc(a.data.length);
  for (let i = 0; i < a.data.length; i++) {
    out[i] = Math.round(a.data[i] * weight + b.data[i] * (1 - weight));
  }

  // Backup target (não sobrescreve se já existe)
  const tgt = framePath(TARGET);
  const bakName = `.bak-${PREFIX}-${String(TARGET).padStart(3, "0")}.webp`;
  const bakPath = path.join(FRAMES_DIR, bakName);
  try {
    await fs.access(bakPath);
    console.log(`backup já existe: ${bakName} (preservado da run anterior)`);
  } catch {
    await fs.copyFile(tgt, bakPath);
    console.log(`backup criado: ${bakName}`);
  }

  const webpBuf = await sharp(out, {
    raw: { width: a.info.width, height: a.info.height, channels: 3 },
  })
    .webp({ quality: 88, effort: 6 })
    .toBuffer();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.writeFile(tgt, webpBuf);
      break;
    } catch (err) {
      if (attempt === 4 || (err.code !== "EPERM" && err.code !== "EBUSY")) throw err;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.log(`escrito: ${tgt}`);
}

main();
