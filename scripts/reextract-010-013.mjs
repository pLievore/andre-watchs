/**
 * reextract-010-013.mjs
 *
 * Re-extracts frames 010–013 directly from veo3_output.mp4 using the same
 * bar-crop as the hard-bar frames (crop=1072:720:104:0 → scale to 1340px →
 * pad to 1600×900 with per-frame background colour).
 *
 * This avoids the seam artifact from processing an already-scaled frame that
 * still contains a residual gradient bar.
 *
 * Usage: node scripts/reextract-010-013.mjs [--dry-run]
 */

import { spawnSync } from "child_process";
import { createRequire } from "module";
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ffmpegBin = require("ffmpeg-static");

const VIDEO     = "veo3_output.mp4";
const SRC_DIR   = "public/hero-sequence";
const OUT_DIR   = "public/hero-sequence-r1013";
const PREFIX    = "jordan1";
const TOTAL     = 72;
// Frames to re-extract from video (1-indexed)
const FIX_START = 10;
const FIX_END   = 13;
// Known bar crop from cropdetect: 104px bars in 1280px video → 130px in 1600
const CROP_W = 1072; const CROP_H = 720; const CROP_X = 104; const CROP_Y = 0;
// Scale bar-cropped content to same zoom as clean frames: 1600 * (1072/1280)
const CONTENT_W = Math.round(1600 * CROP_W / 1280); // 1340
const WIDTH = 1600; const HEIGHT = 900; const QUALITY = 95;
const FPS = 9;

const isDryRun = process.argv.includes("--dry-run");

function probeFPS() {
  const r = spawnSync(ffmpegBin, ["-v", "error", "-i", VIDEO, "-f", "null", "NUL"], { encoding: "utf8" });
  const m = (r.stderr ?? "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return FPS;
  const dur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  return TOTAL / dur;
}

async function sampleSideColors(imgPath) {
  // Sample a thin strip from each side of the top region (top 100px)
  // so the padding colour seamlessly matches each respective edge.
  const { width, height } = await sharp(imgPath).metadata();
  const sliceH = Math.min(height, 100); // top 100 rows — pure background
  const STRIP = 25; // px from each side, staying inside any edge artefacts

  async function mean(region) {
    const buf = await sharp(imgPath).extract(region).raw().toBuffer();
    let R = 0, G = 0, B = 0;
    const n = buf.length / 3;
    for (let i = 0; i < buf.length; i += 3) { R += buf[i]; G += buf[i+1]; B += buf[i+2]; }
    return { r: Math.round(R/n), g: Math.round(G/n), b: Math.round(B/n) };
  }

  const leftColor  = await mean({ left: 0,             top: 0, width: STRIP, height: sliceH });
  const rightColor = await mean({ left: width - STRIP, top: 0, width: STRIP, height: sliceH });
  return { leftColor, rightColor };
}

async function main() {
  if (!existsSync(VIDEO)) { console.error("Video not found:", VIDEO); process.exit(1); }
  if (isDryRun) console.log("DRY RUN\n");

  const fps = probeFPS();
  // Start time: frame FIX_START (1-indexed) → t = (FIX_START-1)/fps
  const startTime = (FIX_START - 1) / fps;
  const frameCount = FIX_END - FIX_START + 1; // 4

  console.log(`FPS          : ${fps.toFixed(4)}`);
  console.log(`Extracting   : frames ${FIX_START}–${FIX_END} (${frameCount} frames)`);
  console.log(`Start time   : ${startTime.toFixed(6)}s`);
  console.log(`Crop + scale : crop=${CROP_W}:${CROP_H}:${CROP_X}:${CROP_Y}, scale=${CONTENT_W}:-1`);
  console.log(`Final size   : ${WIDTH}×${HEIGHT}, q${QUALITY}`);
  console.log(`Output dir   : ${OUT_DIR}/\n`);

  if (isDryRun) return;

  mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir  = OUT_DIR + "-tmp";
  mkdirSync(tmpDir, { recursive: true });

  // Extract the 4 bar-cropped frames from the video
  const r = spawnSync(ffmpegBin, [
    "-y", "-loglevel", "error",
    "-ss", startTime.toFixed(6),
    "-i", VIDEO,
    "-vf", `fps=${fps},crop=${CROP_W}:${CROP_H}:${CROP_X}:${CROP_Y},scale=${CONTENT_W}:-1:flags=lanczos`,
    "-c:v", "libwebp", "-compression_level", "6",
    "-quality", String(QUALITY),
    "-preset", "picture", "-loop", "0", "-an",
    "-frames:v", String(frameCount),
    join(tmpDir, `${PREFIX}-%03d.webp`),
  ], { encoding: "utf8" });

  if (r.status !== 0) { console.error("ffmpeg failed:\n", r.stderr); process.exit(1); }

  const tmpFiles = readdirSync(tmpDir).filter(f => f.endsWith(".webp")).sort();
  console.log(`Extracted ${tmpFiles.length} frames from video.`);

  // Pad each extracted frame and write to OUT_DIR with correct frame number
  for (let i = 0; i < tmpFiles.length; i++) {
    const frameNum = FIX_START + i;
    const srcPath  = join(tmpDir, tmpFiles[i]);
    const destName = `${PREFIX}-${String(frameNum).padStart(3,"0")}.webp`;
    const destPath = join(OUT_DIR, destName);

    const { width: srcW, height: srcH } = await sharp(srcPath).metadata();
    const { leftColor, rightColor } = await sampleSideColors(srcPath);
    const padLeft = Math.round((WIDTH  - srcW)  / 2); // 130
    const padTop  = Math.round((HEIGHT - srcH)  / 2); // 0
    const padRight = WIDTH - srcW - padLeft;

    // Build the 1600×900 image using separate left/right background colours
    // so each seam matches the actual content-edge colour on that side.
    const rightStrip = await sharp({
      create: { width: padRight, height: HEIGHT, channels: 3, background: rightColor },
    }).png().toBuffer();

    await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: leftColor } })
      .composite([
        { input: rightStrip, left: padLeft + srcW, top: 0 },
        { input: srcPath,    left: padLeft,         top: padTop },
      ])
      .sharpen({ sigma: 0.4, m1: 0.5, m2: 3 })
      .webp({ quality: QUALITY })
      .toFile(destPath);

    console.log(`  [done] ${destName}  (${srcW}×${srcH} → ${WIDTH}×${HEIGHT}, L=rgb(${leftColor.r},${leftColor.g},${leftColor.b}) R=rgb(${rightColor.r},${rightColor.g},${rightColor.b}), pad=${padLeft}px)`);
  }

  // Copy all other frames from current hero-sequence (unchanged)
  for (let i = 1; i <= TOTAL; i++) {
    if (i >= FIX_START && i <= FIX_END) continue;
    const name = `${PREFIX}-${String(i).padStart(3,"0")}.webp`;
    const src  = join(SRC_DIR, name);
    const dest = join(OUT_DIR, name);
    if (existsSync(src) && !existsSync(dest)) copyFileSync(src, dest);
  }

  // Cleanup tmp
  const { rmSync } = await import("fs");
  rmSync(tmpDir, { recursive: true, force: true });

  const total = readdirSync(OUT_DIR).filter(f => f.endsWith(".webp")).length;
  console.log(`\nDone. ${total} frames in ${OUT_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-r1013 public\\hero-sequence");
}

main().catch(err => { console.error(err); process.exit(1); });
