/**
 * fix-staging-bars.mjs
 *
 * Post-processes public/hero-sequence-final/ by:
 *   1. Auto-detecting which frames have black letterbox bars (pixel scan)
 *   2. Cropping bars + sampling background color from the first clean frame
 *   3. Padding bar-affected frames with the matched background color
 *   4. Leaving clean frames untouched
 *
 * Run after extract-all-frames.mjs:
 *   node scripts/fix-staging-bars.mjs
 */

import sharp from "sharp";
import { readdir, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const STAGING_DIR   = "public/hero-sequence-fixed3";
const OUT_DIR       = "public/hero-sequence-fixed4";
const PREFIX        = "jordan1";
const WIDTH         = 1600;
const HEIGHT        = 900;
const QUALITY       = 90;
const BLACK_THRESHOLD = 100;  // avg RGB below this = black bar column
const SAMPLE_ROWS   = 16;     // rows sampled per column for bar detection
const MIN_BAR_WIDTH = 20;     // ignore bars narrower than this (noise)

async function detectBars(imgPath) {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const avgAt = (x) => {
    let sum = 0;
    for (let s = 0; s < SAMPLE_ROWS; s++) {
      const y = Math.floor(height * (s + 1) / (SAMPLE_ROWS + 1));
      const idx = (y * width + x) * channels;
      sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }
    return sum / SAMPLE_ROWS;
  };

  let leftX = 0;
  for (let x = 0; x < Math.floor(width * 0.4); x++) {
    if (avgAt(x) > BLACK_THRESHOLD) { leftX = x; break; }
  }
  let rightX = width - 1;
  for (let x = width - 1; x > Math.floor(width * 0.6); x--) {
    if (avgAt(x) > BLACK_THRESHOLD) { rightX = x; break; }
  }

  if (leftX < MIN_BAR_WIDTH && (width - 1 - rightX) < MIN_BAR_WIDTH) return null;
  return { leftX, rightX };
}

async function sampleBackground(imgPath, contentLeft, contentRight) {
  const regions = [
    { left: contentLeft + 10, top: 10,  width: 60, height: 40 },
    { left: contentLeft + 10, top: 80,  width: 60, height: 40 },
    { left: contentRight - 70, top: 10, width: 60, height: 40 },
  ];

  const samples = await Promise.all(regions.map(async r => {
    const buf = await sharp(imgPath).extract(r).raw().toBuffer();
    let R = 0, G = 0, B = 0;
    for (let i = 0; i < buf.length; i += 3) { R += buf[i]; G += buf[i+1]; B += buf[i+2]; }
    const n = buf.length / 3;
    return { r: Math.round(R/n), g: Math.round(G/n), b: Math.round(B/n) };
  }));

  return {
    r: Math.round(samples.reduce((a, s) => a + s.r, 0) / samples.length),
    g: Math.round(samples.reduce((a, s) => a + s.g, 0) / samples.length),
    b: Math.round(samples.reduce((a, s) => a + s.b, 0) / samples.length),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const files = (await readdir(STAGING_DIR))
    .filter(f => f.startsWith(PREFIX) && f.endsWith(".webp"))
    .sort();

  console.log(`Scanning ${files.length} frames in ${STAGING_DIR}/ for bars…\n`);

  // 1. Find the first clean (bar-free) frame to use as background color reference
  let bgColor = null;
  let firstCleanFrame = null;
  for (const f of files) {
    const bars = await detectBars(join(STAGING_DIR, f));
    if (!bars) {
      firstCleanFrame = f;
      break;
    }
  }

  if (!firstCleanFrame) {
    console.error("No bar-free frame found in staging — cannot determine background color.");
    process.exit(1);
  }
  console.log(`First clean frame: ${firstCleanFrame}`);

  // 2. Process each frame
  let fixedCount = 0;
  for (const f of files) {
    const fPath = join(STAGING_DIR, f);
    const bars = await detectBars(fPath);

    if (!bars) {
      await copyFile(fPath, join(OUT_DIR, f));
      process.stdout.write(`  [ok   ] ${f}\n`);
      continue;
    }

    const { leftX, rightX } = bars;
    const inset = 4; // trim past anti-aliasing fringe
    const cropLeft   = leftX + inset;
    const cropWidth  = rightX - leftX + 1 - 2 * inset;

    // Sample background from THIS frame (inside content area)
    const bg = await sampleBackground(fPath, cropLeft, cropLeft + cropWidth);

    const padLeft = Math.round((WIDTH - cropWidth) / 2);
    const padTop  = 0; // no vertical bars

    await sharp(fPath)
      .extract({ left: cropLeft, top: 0, width: cropWidth, height: HEIGHT })
      .extend({
        top:    padTop,
        bottom: 0,
        left:   padLeft,
        right:  WIDTH - cropWidth - padLeft,
        background: bg,
      })
      .webp({ quality: QUALITY })
      .toFile(join(OUT_DIR, f));

    console.log(`  [fixed] ${f}  bars=${leftX}px, bg=rgb(${bg.r},${bg.g},${bg.b})`);
    fixedCount++;
  }

  console.log(`\nDone. Fixed ${fixedCount} frame(s). Output: ${OUT_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-fixed2 public\\hero-sequence");
}

main().catch(err => { console.error(err); process.exit(1); });
