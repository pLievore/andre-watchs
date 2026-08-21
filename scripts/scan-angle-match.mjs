/**
 * Compara um frame de referência contra uma faixa, pra achar quais frames
 * estão no MESMO ângulo de rotação (MAD baixo = mesmo ângulo).
 * Revela loops/jitter na rotação do Veo.
 *
 *   node scripts/scan-angle-match.mjs <ref> <start> <end>
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const REF = Number(process.argv[2]);
const START = Number(process.argv[3] ?? 1);
const END = Number(process.argv[4] ?? 40);

async function loadRaw(i) {
  const buf = await fs.readFile(path.join(FRAMES_DIR, `jordan1-${String(i).padStart(3, "0")}.webp`));
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function mad(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

async function main() {
  const ref = await loadRaw(REF);
  console.log(`MAD vs frame ${REF} (baixo = mesmo ângulo):\n`);
  const results = [];
  for (let i = START; i <= END; i++) {
    if (i === REF) continue;
    const cur = await loadRaw(i);
    const d = mad(ref.data, cur.data);
    results.push({ i, d });
  }
  // print
  for (const r of results) {
    const bar = "█".repeat(Math.min(40, Math.round(r.d)));
    const mark = r.d < 8 ? " ◀─ match" : "";
    console.log(`  ${String(r.i).padStart(2)}  ${r.d.toFixed(2).padStart(6)}  ${bar}${mark}`);
  }
  const min = results.reduce((m, r) => (r.d < m.d ? r : m), results[0]);
  console.log(`\nmelhor match com ${REF}: frame ${min.i} (MAD ${min.d.toFixed(2)})`);
}

main();
