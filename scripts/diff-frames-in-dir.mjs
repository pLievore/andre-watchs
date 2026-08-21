/**
 * Versão da diff-frames que aceita o diretório como CLI arg.
 *   node scripts/diff-frames-in-dir.mjs <dir> <start> <end>
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

sharp.cache(false);
sharp.concurrency(1);

const DIR = process.argv[2];
const START = Number(process.argv[3] ?? 1);
const END = Number(process.argv[4] ?? 30);

async function loadRaw(i) {
  const filePath = path.join(DIR, `jordan1-${String(i).padStart(3, "0")}.webp`);
  const buf = await fs.readFile(filePath);
  return await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

function mad(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

async function main() {
  console.log(`consecutive diffs in ${DIR}, frames ${START}..${END}\n`);
  let prev = await loadRaw(START);
  const diffs = [];
  for (let i = START + 1; i <= END; i++) {
    const cur = await loadRaw(i);
    const d = mad(prev.data, cur.data);
    diffs.push({ pair: `${i - 1}→${i}`, mad: d });
    prev = cur;
  }
  const mean = diffs.reduce((a, b) => a + b.mad, 0) / diffs.length;
  const std = Math.sqrt(diffs.map((d) => (d.mad - mean) ** 2).reduce((a, b) => a + b, 0) / diffs.length);
  const thr = mean + 1.5 * std;
  for (const d of diffs) {
    const flag = d.mad > thr ? " ◀── SPIKE" : "";
    const bar = "█".repeat(Math.min(40, Math.round(d.mad)));
    console.log(`  ${d.pair.padStart(7)}  ${d.mad.toFixed(2).padStart(6)}  ${bar}${flag}`);
  }
  console.log(`\nmean=${mean.toFixed(2)}  std=${std.toFixed(2)}  threshold=${thr.toFixed(2)}`);
}

main();
