/**
 * fix-hero-frames.mjs
 *
 * Fixes two issues in the hero sequence:
 *   1. Black letterbox bars baked into frames 001-BARS_END_FRAME (product photo source)
 *   2. All frames re-encoded at higher WebP quality (QUALITY vs original 80)
 *
 * Usage:
 *   node scripts/fix-hero-frames.mjs
 *   node scripts/fix-hero-frames.mjs --dry-run      # preview crop params only
 *   node scripts/fix-hero-frames.mjs --bars-end=14  # override last bars frame
 *   node scripts/fix-hero-frames.mjs --quality=90
 *
 * Because the Next.js dev server locks files in public/, this script writes to
 * a staging directory (public/hero-sequence-fixed/) by default.
 * After it finishes, stop the dev server and run:
 *   Remove-Item public\hero-sequence -Recurse -Force
 *   Rename-Item public\hero-sequence-fixed public\hero-sequence
 */

import sharp from "sharp";
import { readdir, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// ─── Config ──────────────────────────────────────────────────────────────────
const FRAMES_DIR = "public/hero-sequence";
const OUT_DIR    = "public/hero-sequence-fixed"; // staging; swap in after script
const PREFIX = "jordan1";
const DEFAULT_BARS_END = 14;   // frames 1..N have black bars (inclusive)
const DEFAULT_QUALITY = 90;    // WebP quality (0-100); original was 80
const TARGET_WIDTH = 1600;     // px — match existing frame resolution
const BLACK_THRESHOLD = 20;    // avg RGB below this = black bar column
const CROP_INSET = 4;          // extra px to trim past the bar→content fringe
const SAMPLE_ROWS = 16;        // rows sampled per column for bar detection
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith("--"))
      .map(a => {
        const [k, v] = a.replace("--", "").split("=");
        return [k, v ?? true];
      }),
  );
  return {
    dryRun: !!args["dry-run"],
    barsEnd: args["bars-end"] ? parseInt(args["bars-end"]) : DEFAULT_BARS_END,
    quality: args["quality"] ? parseInt(args["quality"]) : DEFAULT_QUALITY,
  };
}

/**
 * Scans left and right columns of a frame to detect solid-black letterbox bars.
 * Returns { leftX, rightX } — the first/last non-black column indices.
 */
async function detectBlackBars(framePath) {
  const { data, info } = await sharp(framePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  const avgBrightnessAtX = (x) => {
    let sum = 0;
    for (let s = 0; s < SAMPLE_ROWS; s++) {
      const y = Math.floor(height * (s + 1) / (SAMPLE_ROWS + 1));
      const idx = (y * width + x) * channels;
      sum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    }
    return sum / SAMPLE_ROWS;
  };

  // Scan from left
  let leftX = 0;
  for (let x = 0; x < Math.floor(width * 0.4); x++) {
    if (avgBrightnessAtX(x) > BLACK_THRESHOLD) {
      leftX = x;
      break;
    }
  }

  // Scan from right
  let rightX = width;
  for (let x = width - 1; x > Math.floor(width * 0.6); x--) {
    if (avgBrightnessAtX(x) > BLACK_THRESHOLD) {
      rightX = x + 1;
      break;
    }
  }

  return { leftX: leftX + CROP_INSET, rightX: rightX - CROP_INSET, srcWidth: width, srcHeight: height };
}

async function main() {
  const { dryRun, barsEnd, quality } = parseArgs();

  if (dryRun) console.log("DRY RUN — no files will be modified\n");

  // Ensure output staging dir exists
  if (!dryRun) {
    await mkdir(OUT_DIR, { recursive: true });
  }

  // Detect crop from the first bars-affected frame
  const refFrame = join(FRAMES_DIR, `${PREFIX}-001.webp`);
  if (!existsSync(refFrame)) {
    console.error(`Reference frame not found: ${refFrame}`);
    process.exit(1);
  }

  const { leftX, rightX, srcWidth, srcHeight } = await detectBlackBars(refFrame);
  const cropW = rightX - leftX;
  const hasBars = leftX > 0 || rightX < srcWidth;

  console.log(`Reference frame : ${PREFIX}-001.webp (${srcWidth}×${srcHeight})`);
  if (hasBars) {
    console.log(`Detected bars   : left=${leftX}px  right=${srcWidth - rightX}px`);
    console.log(`Crop region     : x=${leftX}, width=${cropW} → extend with white → ${srcWidth}×${srcHeight}`);
  } else {
    console.log(`Detected bars   : none (no crop needed for any frame)`);
  }
  console.log(`Frames with bars: 001-${String(barsEnd).padStart(3, "0")}`);
  console.log(`Output quality  : WebP q${quality} (was q80)`);
  console.log(`Output width    : ${TARGET_WIDTH}px`);
  console.log("");

  if (dryRun) return;

  const files = (await readdir(FRAMES_DIR))
    .filter(f => f.startsWith(PREFIX) && f.endsWith(".webp"))
    .sort();

  let cropped = 0;
  let qualityOnly = 0;

  for (const file of files) {
    const match = file.match(/-(\d+)\.webp$/);
    if (!match) continue;
    const frameNum = parseInt(match[1]);

    const src = join(FRAMES_DIR, file);
    const dest = join(OUT_DIR, file);

    let pipeline = sharp(src);

    if (hasBars && frameNum <= barsEnd) {
      // Crop bars, then extend with white to keep original dimensions.
      // This preserves the 1600×900 aspect ratio so cover-fit is identical
      // across all 72 frames — no zoom jump at frame 14→15 transition.
      pipeline = pipeline
        .extract({ left: leftX, top: 0, width: cropW, height: srcHeight })
        .extend({
          left: leftX,
          right: srcWidth - rightX,
          top: 0,
          bottom: 0,
          background: { r: 255, g: 255, b: 255 },
        });
      cropped++;
    } else {
      qualityOnly++;
    }

    const buf = await pipeline
      .resize(TARGET_WIDTH, null, { kernel: "lanczos3" })
      .webp({ quality, effort: 5 })
      .toBuffer();

    await writeFile(dest, buf);

    const tag = hasBars && frameNum <= barsEnd ? "crop+q" : "q    ";
    process.stdout.write(`  [${tag}] ${file}\n`);
  }

  console.log(
    `\nDone. ${cropped} frames cropped, ${qualityOnly} quality-only. WebP q${quality}.`,
  );
  console.log(`\nOutput written to: ${OUT_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-fixed public\\hero-sequence");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
