/**
 * Compara cada frame em public/hero-sequence/ contra a versão equivalente em
 * public/hero-sequence/.motion-tmp/. Mostra onde os dois divergem.
 *
 * Útil pra decidir qual janela de frames precisa ser substituída pela versão
 * motion-compensated.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const FRAMES_DIR = "public/hero-sequence";
const TMP_DIR = path.join(FRAMES_DIR, ".motion-tmp");

const START = Number(process.argv[2] ?? 1);
const END = Number(process.argv[3] ?? 30);

async function loadRaw(filePath) {
  const buf = await fs.readFile(filePath);
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function mad(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

async function main() {
  console.log(`current vs motion-tmp, frames ${START}..${END}`);
  console.log("frame   MAD   (high = current differs from motion-comp)");
  console.log("──────────────────────────────────────────────────");

  for (let i = START; i <= END; i++) {
    const name = `jordan1-${String(i).padStart(3, "0")}.webp`;
    try {
      const a = await loadRaw(path.join(FRAMES_DIR, name));
      const b = await loadRaw(path.join(TMP_DIR, name));
      const d = mad(a.data, b.data);
      const bar = "█".repeat(Math.min(40, Math.round(d / 2)));
      console.log(`  ${String(i).padStart(3)}   ${d.toFixed(2).padStart(6)}  ${bar}`);
    } catch (err) {
      console.log(`  ${String(i).padStart(3)}   error: ${err.message}`);
    }
  }
}

main();
