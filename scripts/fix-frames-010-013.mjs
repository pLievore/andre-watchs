/**
 * fix-frames-010-013.mjs
 *
 * Fixes frames 010–013: removes residual letterbox gradient bars from the
 * video's transition section and re-encodes at higher quality (q95) with
 * mild sharpening. Also re-encodes ALL other frames at q95 + sharpen.
 *
 * Usage:
 *   node scripts/fix-frames-010-013.mjs [--dry-run]
 */

import sharp from "sharp";
import { readdir, copyFile, mkdir } from "fs/promises";
import { join } from "path";

const SRC_DIR   = "public/hero-sequence";
const OUT_DIR   = "public/hero-sequence-hq";
const PREFIX    = "jordan1";
const WIDTH     = 1600;
const HEIGHT    = 900;
const QUALITY   = 95;            // higher quality encoding for all frames
const THRESHOLD = 180;           // avg edge brightness below this = bar present
const INSET     = 4;             // trim past anti-aliasing fringe at bar edge
const SAMPLE_ROWS = 16;

const isDryRun = process.argv.includes("--dry-run");

async function getEdgeBrightness(imgPath) {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const avgAt = (x) => {
    let s = 0;
    for (let r = 0; r < SAMPLE_ROWS; r++) {
      const y = Math.floor(height * (r + 1) / (SAMPLE_ROWS + 1));
      const i = (y * width + x) * channels;
      s += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    return s / SAMPLE_ROWS;
  };
  return { left: avgAt(0), mid: avgAt(130), right: avgAt(width - 1) };
}

async function sampleBgFromStrips(imgPath, contentLeft, contentWidth) {
  const regions = [
    { left: contentLeft + 10, top: 10,  width: 80, height: 50 },
    { left: contentLeft + 10, top: 120, width: 80, height: 50 },
    { left: contentLeft + contentWidth - 90, top: 10,  width: 80, height: 50 },
    { left: contentLeft + contentWidth - 90, top: 120, width: 80, height: 50 },
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

async function detectBarBoundary(imgPath) {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const avgAt = (x) => {
    let s = 0;
    for (let r = 0; r < SAMPLE_ROWS; r++) {
      const y = Math.floor(height * (r + 1) / (SAMPLE_ROWS + 1));
      const i = (y * width + x) * channels;
      s += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    return s / SAMPLE_ROWS;
  };
  let leftX = 0;
  for (let x = 0; x < Math.floor(width * 0.4); x++) {
    if (avgAt(x) > THRESHOLD) { leftX = x; break; }
  }
  let rightX = width - 1;
  for (let x = width - 1; x > Math.floor(width * 0.6); x--) {
    if (avgAt(x) > THRESHOLD) { rightX = x; break; }
  }
  if (leftX < 5 && rightX > width - 5) return null;
  return { leftX, rightX };
}

async function main() {
  if (isDryRun) console.log("DRY RUN — no files written\n");

  const files = (await readdir(SRC_DIR))
    .filter(f => f.startsWith(PREFIX) && f.endsWith(".webp"))
    .sort();

  console.log(`Processing ${files.length} frames → ${OUT_DIR}/  (q${QUALITY} + sharpen)\n`);

  if (!isDryRun) await mkdir(OUT_DIR, { recursive: true });

  let fixedCount = 0;
  for (const f of files) {
    const src  = join(SRC_DIR, f);
    const dest = join(OUT_DIR, f);

    const { left } = await getEdgeBrightness(src);
    const hasBars = left < THRESHOLD;

    if (!hasBars) {
      // Re-encode at q95 + sharpen (quality upgrade only)
      if (!isDryRun) {
        await sharp(src)
          .sharpen({ sigma: 0.4, m1: 0.5, m2: 3 })
          .webp({ quality: QUALITY })
          .toFile(dest);
      }
      process.stdout.write(`  [q95  ] ${f}  edge=${left.toFixed(0)}\n`);
    } else {
      // Detect exact bar boundary
      const bars = await detectBarBoundary(src);
      const cropLeft  = (bars?.leftX ?? 0) + INSET;
      const cropRight = (bars?.rightX ?? WIDTH - 1) - INSET;
      const cropWidth = cropRight - cropLeft + 1;
      const padLeft   = Math.round((WIDTH - cropWidth) / 2);

      // Sample background from inside content area
      const bg = await sampleBgFromStrips(src, cropLeft, cropWidth);

      if (isDryRun) {
        console.log(`  [fix  ] ${f}  edge=${left.toFixed(0)}, bar=${cropLeft}px, bg=rgb(${bg.r},${bg.g},${bg.b})`);
      } else {
        await sharp(src)
          .extract({ left: cropLeft, top: 0, width: cropWidth, height: HEIGHT })
          .extend({
            top: 0, bottom: 0,
            left: padLeft,
            right: WIDTH - cropWidth - padLeft,
            background: bg,
          })
          .sharpen({ sigma: 0.4, m1: 0.5, m2: 3 })
          .webp({ quality: QUALITY })
          .toFile(dest);
        console.log(`  [fixed] ${f}  edge=${left.toFixed(0)}, bar=${cropLeft}px, bg=rgb(${bg.r},${bg.g},${bg.b})`);
      }
      fixedCount++;
    }
  }

  console.log(`\nDone. Fixed bars: ${fixedCount}. All frames re-encoded at q${QUALITY}.`);
  if (!isDryRun) {
    console.log("\nTo apply (stop dev server first):");
    console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
    console.log("  Rename-Item public\\hero-sequence-hq public\\hero-sequence");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
