/**
 * Acha onde a sequência motion-comp pode "reencontrar" a sequência atual com
 * transição suave. Pra cada N, mede MAD(motion-comp[N], current[N+1]) — ou
 * seja, o salto se a janela motion-comp terminar em N e voltar pro current.
 *
 *   node scripts/find-rejoin.mjs <start> <end>
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const TMP_DIR = path.join(FRAMES_DIR, ".motion-tmp");

const START = Number(process.argv[2] ?? 14);
const END = Number(process.argv[3] ?? 28);

async function loadRaw(dir, i) {
  const buf = await fs.readFile(path.join(dir, `jordan1-${String(i).padStart(3, "0")}.webp`));
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function mad(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

async function main() {
  console.log("janela motion-comp termina em N, volta pro current em N+1:");
  console.log("  N   MAD(mc[N] -> cur[N+1])   (baixo = reentry suave)");
  console.log("──────────────────────────────────────────────────");
  for (let n = START; n <= END; n++) {
    const mc = await loadRaw(TMP_DIR, n);
    const cur = await loadRaw(FRAMES_DIR, n + 1);
    const d = mad(mc.data, cur.data);
    const bar = "█".repeat(Math.min(40, Math.round(d)));
    console.log(`  ${String(n).padStart(2)}   ${d.toFixed(2).padStart(6)}   ${bar}`);
  }
}

main();
