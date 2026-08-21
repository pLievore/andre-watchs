/**
 * Diagnóstico: compara cada par (i, i+1) e printa o MAD (mean absolute diff)
 * de pixel. Frames "fluidos" têm MAD baixo (≈5-15). Picos = candidatos a
 * dessincronização (modelo Veo perdendo coerência temporal).
 *
 * Roda direto: node scripts/diff-frames.mjs [start] [end]
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const PREFIX = "jordan1";

const START = Number(process.argv[2] ?? 1);
const END = Number(process.argv[3] ?? 30);

async function loadRaw(i) {
  const filePath = path.join(
    FRAMES_DIR,
    `${PREFIX}-${String(i).padStart(3, "0")}.webp`,
  );
  const buf = await fs.readFile(filePath);
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function meanAbsDiff(a, b) {
  if (a.length !== b.length) throw new Error("size mismatch");
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i]);
  }
  return sum / a.length;
}

async function main() {
  console.log(`comparing pixel diff between consecutive frames ${START}..${END}\n`);
  console.log("frame i→i+1   MAD   (higher = bigger jump)");
  console.log("──────────────────────────────────────────");

  let prev = await loadRaw(START);
  const diffs = [];

  for (let i = START + 1; i <= END; i++) {
    const cur = await loadRaw(i);
    const d = meanAbsDiff(prev.data, cur.data);
    diffs.push({ pair: `${i - 1}→${i}`, mad: d });
    prev = cur;
  }

  // Stats
  const mads = diffs.map((d) => d.mad);
  const mean = mads.reduce((a, b) => a + b, 0) / mads.length;
  const std = Math.sqrt(
    mads.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / mads.length,
  );
  const threshold = mean + 1.5 * std;

  for (const d of diffs) {
    const flag = d.mad > threshold ? " ◀── SPIKE" : "";
    const bar = "█".repeat(Math.min(40, Math.round(d.mad)));
    console.log(`  ${d.pair.padStart(7)}  ${d.mad.toFixed(2).padStart(6)}  ${bar}${flag}`);
  }

  console.log("\n──────────────────────────────────────────");
  console.log(`mean=${mean.toFixed(2)}  std=${std.toFixed(2)}  spike-threshold=${threshold.toFixed(2)}`);
}

main();
