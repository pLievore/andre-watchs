/**
 * fix-frame-padding.mjs — one-time fix for white-padding tone mismatch.
 *
 * Context: fix-hero-frames.mjs already cropped frames 001-014 and extended
 * them with pure white (255,255,255).  For frames 005-014 the actual
 * background is warm gray/off-white (Veo 3 style), creating visible white
 * strips on the sides.
 *
 * This script:
 *   1. Re-extracts the content area using the known crop boundaries
 *   2. Samples the per-frame background color from the top corners of the
 *      content (well away from the shoe, which is always centered/low)
 *   3. Re-extends with the sampled color so the padding is invisible
 *   4. Copies frames 015-072 unchanged (no re-encode)
 *
 * Usage:
 *   node scripts/fix-frame-padding.mjs [--dry-run]
 *
 * After the script finishes, stop the dev server and run:
 *   Remove-Item public\hero-sequence -Recurse -Force
 *   Rename-Item public\hero-sequence-fixed public\hero-sequence
 */

import sharp from "sharp";
import { readdir, writeFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// ─── Known boundaries from the previous fix-hero-frames.mjs run ─────────────
// Original frames were 1600×900 with black bars at x=0..130 (left) and
// x=1468..1599 (right). After crop+extend the content occupies:
const CONTENT_LEFT  = 131;  // first non-padding column
const CONTENT_WIDTH = 1337; // px  (= 1600 − 131 − 132)
const CONTENT_RIGHT_PAD = 132; // px of right padding to restore
const FRAME_W = 1600;
const FRAME_H = 900;

const FRAMES_DIR = "public/hero-sequence";
const OUT_DIR    = "public/hero-sequence-fixed";
const PREFIX     = "jordan1";
const FIX_START  = 1;
const FIX_END    = 14;
const QUALITY    = 90;
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sample the dominant background color from the top corners and top-center
 * of the extracted content area.  These regions are clear sky above the shoe
 * in all frames 001-014.
 */
async function sampleBackground(framePath) {
  const { data, info } = await sharp(framePath)
    .extract({ left: CONTENT_LEFT, top: 0, width: CONTENT_WIDTH, height: FRAME_H })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, channels } = info;

  // Sample three strips across the very top of the frame (y 5-55).
  // The shoe never enters this zone in frames 001-014.
  const strips = [
    { x1: 10,                     x2: 160,                   y1: 5, y2: 55 },
    { x1: Math.floor(width * 0.4), x2: Math.floor(width * 0.6), y1: 5, y2: 35 },
    { x1: width - 160,             x2: width - 10,            y1: 5, y2: 55 },
  ];

  let r = 0, g = 0, b = 0, n = 0;
  for (const { x1, x2, y1, y2 } of strips) {
    for (let y = y1; y < y2; y++) {
      for (let x = x1; x < x2; x++) {
        const i = (y * width + x) * channels;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
        n++;
      }
    }
  }

  return {
    r: Math.round(r / n),
    g: Math.round(g / n),
    b: Math.round(b / n),
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("DRY RUN — no files will be written\n");

  if (!existsSync(FRAMES_DIR)) {
    console.error(`Source directory not found: ${FRAMES_DIR}`);
    process.exit(1);
  }

  if (!dryRun) await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(FRAMES_DIR))
    .filter(f => f.startsWith(PREFIX) && f.endsWith(".webp"))
    .sort();

  for (const file of files) {
    const match = file.match(/-(\d+)\.webp$/);
    if (!match) continue;
    const frameNum = parseInt(match[1]);

    const src  = join(FRAMES_DIR, file);
    const dest = join(OUT_DIR,    file);

    if (frameNum < FIX_START || frameNum > FIX_END) {
      // Frames 015-072: copy unchanged — no re-encode, zero quality loss.
      if (!dryRun) await copyFile(src, dest);
      process.stdout.write(`  [copy ] ${file}\n`);
      continue;
    }

    const bg = await sampleBackground(src);

    if (dryRun) {
      console.log(`  [fix  ] ${file}  →  bg=(${bg.r}, ${bg.g}, ${bg.b})`);
      continue;
    }

    const buf = await sharp(src)
      .extract({ left: CONTENT_LEFT, top: 0, width: CONTENT_WIDTH, height: FRAME_H })
      .extend({
        left:   CONTENT_LEFT,
        right:  CONTENT_RIGHT_PAD,
        top:    0,
        bottom: 0,
        background: bg,
      })
      // Resize is identity (still 1600px) but ensures canvas is exactly right.
      .resize(FRAME_W, null, { kernel: "lanczos3" })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer();

    await writeFile(dest, buf);
    process.stdout.write(`  [fix  ] ${file}  bg=(${bg.r}, ${bg.g}, ${bg.b})\n`);
  }

  if (dryRun) return;

  console.log(`\nOutput written to: ${OUT_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-fixed public\\hero-sequence");
}

main().catch(err => { console.error(err); process.exit(1); });
