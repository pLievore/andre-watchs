/**
 * Compara um par de frames arbitrário pra isolar qual é o outlier num spike.
 *   node scripts/diff-pair.mjs <a> <b>
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const A = Number(process.argv[2]);
const B = Number(process.argv[3]);

async function loadRaw(i) {
  const buf = await fs.readFile(
    path.join("public/hero-sequence", `jordan1-${String(i).padStart(3, "0")}.webp`),
  );
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function mad(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

async function main() {
  const a = await loadRaw(A);
  const b = await loadRaw(B);
  console.log(`MAD(${A}, ${B}) = ${mad(a.data, b.data).toFixed(2)}`);
}

main();
