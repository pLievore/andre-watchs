/**
 * remaster-all.mjs  —  Full quality remaster of all 72 hero frames.
 *
 * Quality improvements vs previous pipeline:
 *   • hqdn3d=1.5:1.5:6:6   temporal + spatial denoising, removes H.264 block
 *                            artefacts (the main source of "pixelation")
 *   • unsharp=5:5:1.2       luma sharpening AFTER upscaling (avoids amplifying
 *                            compression noise on the source)
 *   • sharp { sigma:0.7, m1:1.0, m2:5 }  stronger final sharpening pass
 *   • Frames 1–BAR_END  : bar-crop + per-side edge-matched padding
 *   • Frames BAR_END+1–72 : full 1600×900, no padding needed
 *
 * Usage: node scripts/remaster-all.mjs [--dry-run]
 */

import { spawnSync }                              from "child_process";
import { createRequire }                           from "module";
import { existsSync, mkdirSync, readdirSync }      from "fs";
import { join, resolve }                           from "path";
import sharp                                       from "sharp";

const require   = createRequire(import.meta.url);
const ffmpegBin = require("ffmpeg-static");

// ─── Config ──────────────────────────────────────────────────────────────────
const VIDEO     = "veo3_output.mp4";
const OUT_DIR   = "public/hero-sequence-hq2";
const PREFIX    = "jordan1";
const TOTAL     = 72;
/** Last frame that has bars (hard OR soft gradient) */
const BAR_END   = 13;
const WIDTH     = 1600;
const HEIGHT    = 900;
const QUALITY   = 95;
const FPS       = 9;   // fallback; probed from video

// Known bar-crop geometry (from cropdetect on the source video)
const CROP_W    = 1072;
const CROP_H    = 720;
const CROP_X    = 104;
const CROP_Y    = 0;
/** Scale bar-cropped content to match clean-frame zoom: 1600 × (1072/1280) */
const CONTENT_W = Math.round(WIDTH * CROP_W / 1280);  // 1340

const isDryRun = process.argv.includes("--dry-run");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ffmpeg(...args) {
  return spawnSync(ffmpegBin, args, { encoding: "utf8" });
}

function probeFPS() {
  const r = ffmpeg("-v", "error", "-i", VIDEO, "-f", "null", "NUL");
  const m = (r.stderr ?? "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return FPS;
  const dur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  return TOTAL / dur;
}

/** Sample the average colour from each horizontal edge (top 100px) independently. */
async function sampleSideColors(imgPath) {
  const { width, height } = await sharp(imgPath).metadata();
  const sliceH = Math.min(height, 100);
  const STRIP  = 25;

  async function mean(region) {
    const buf = await sharp(imgPath).extract(region).raw().toBuffer();
    let R = 0, G = 0, B = 0;
    const n = buf.length / 3;
    for (let i = 0; i < buf.length; i += 3) { R += buf[i]; G += buf[i+1]; B += buf[i+2]; }
    return { r: Math.round(R / n), g: Math.round(G / n), b: Math.round(B / n) };
  }

  const leftColor  = await mean({ left: 0,             top: 0, width: STRIP, height: sliceH });
  const rightColor = await mean({ left: width - STRIP, top: 0, width: STRIP, height: sliceH });
  return { leftColor, rightColor };
}

/** Pad a bar-cropped 1340×900 frame to 1600×900 using per-side background colours. */
async function padAndSharpen(srcPath, destPath) {
  const { width: srcW, height: srcH } = await sharp(srcPath).metadata();
  const padLeft  = Math.round((WIDTH  - srcW) / 2);
  const padTop   = Math.round((HEIGHT - srcH) / 2);
  const padRight = WIDTH - srcW - padLeft;

  const { leftColor, rightColor } = await sampleSideColors(srcPath);

  // Build a 130px right-side strip in the right edge colour
  const rightStrip = await sharp({
    create: { width: padRight, height: HEIGHT, channels: 3, background: rightColor },
  }).png().toBuffer();

  // Compose: left base (leftColor) + right strip + content centred
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: leftColor } })
    .composite([
      { input: rightStrip, left: padLeft + srcW, top: 0      },
      { input: srcPath,    left: padLeft,         top: padTop },
    ])
    .sharpen({ sigma: 0.7, m1: 1.0, m2: 5 })
    .webp({ quality: QUALITY })
    .toFile(destPath);

  return { leftColor, rightColor, padLeft };
}

/** Sharpen + encode a full-size frame (no padding needed). */
async function sharpenAndEncode(srcPath, destPath) {
  await sharp(srcPath)
    .sharpen({ sigma: 0.7, m1: 1.0, m2: 5 })
    .webp({ quality: QUALITY })
    .toFile(destPath);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(VIDEO)) {
    console.error("Video not found:", resolve(VIDEO));
    process.exit(1);
  }

  const fps = probeFPS();
  console.log(`Video FPS   : ${fps.toFixed(4)}`);
  console.log(`Bar frames  : 001–${String(BAR_END).padStart(3, "0")} (crop + pad)`);
  console.log(`Clean frames: ${String(BAR_END + 1).padStart(3, "0")}–072 (full frame)`);
  console.log(`Output dir  : ${OUT_DIR}/`);

  if (isDryRun) { console.log("\nDRY RUN — exiting."); return; }

  mkdirSync(OUT_DIR,   { recursive: true });
  const tmpDir = OUT_DIR + "-tmp";
  mkdirSync(tmpDir, { recursive: true });

  // Quality filter chain applied BEFORE scaling (denoises the source)
  // then AFTER scaling (sharpens the upscaled result)
  const DENOISE = "hqdn3d=1.5:1.5:6:6";
  const SHARPEN = "unsharp=5:5:1.2:3:3:0.0";

  // ══ Pass 1: Bar frames 1–BAR_END ══════════════════════════════════════════
  // Extract with bar-crop + denoise + scale to CONTENT_W + unsharp
  const barCount   = BAR_END;
  const barVF      = `fps=${fps},${DENOISE},crop=${CROP_W}:${CROP_H}:${CROP_X}:${CROP_Y},scale=${CONTENT_W}:-1:flags=lanczos,${SHARPEN}`;
  console.log(`\nPass 1 — Extracting ${barCount} bar frames with quality filters…`);

  const r1 = ffmpeg(
    "-y", "-loglevel", "error",
    "-ss", "0",
    "-i", VIDEO,
    "-vf", barVF,
    "-c:v", "libwebp", "-compression_level", "6",
    "-quality", String(QUALITY), "-preset", "picture", "-loop", "0", "-an",
    "-frames:v", String(barCount),
    join(tmpDir, "bar-%03d.webp"),
  );
  if (r1.status !== 0) { console.error("Pass 1 failed:\n", r1.stderr); process.exit(1); }

  const barFiles = readdirSync(tmpDir).filter(f => f.startsWith("bar-")).sort();
  console.log(`  Extracted ${barFiles.length} bar frames.`);

  for (let i = 0; i < barFiles.length; i++) {
    const frameNum = i + 1;
    const srcPath  = join(tmpDir, barFiles[i]);
    const destName = `${PREFIX}-${String(frameNum).padStart(3, "0")}.webp`;
    const destPath = join(OUT_DIR, destName);
    const { leftColor, rightColor, padLeft } = await padAndSharpen(srcPath, destPath);
    console.log(`  [done] ${destName}  L=rgb(${leftColor.r},${leftColor.g},${leftColor.b}) R=rgb(${rightColor.r},${rightColor.g},${rightColor.b}) pad=${padLeft}px`);
  }

  // ══ Pass 2: Clean frames BAR_END+1–TOTAL ══════════════════════════════════
  const cleanStart = BAR_END + 1;
  const cleanCount = TOTAL - BAR_END;
  const cleanSS    = (BAR_END / fps).toFixed(6);
  const cleanVF    = `fps=${fps},${DENOISE},scale=${WIDTH}:${HEIGHT}:flags=lanczos,${SHARPEN}`;
  console.log(`\nPass 2 — Extracting ${cleanCount} clean frames from ${cleanSS}s…`);

  const r2 = ffmpeg(
    "-y", "-loglevel", "error",
    "-ss", cleanSS,
    "-i", VIDEO,
    "-vf", cleanVF,
    "-c:v", "libwebp", "-compression_level", "6",
    "-quality", String(QUALITY), "-preset", "picture", "-loop", "0", "-an",
    "-frames:v", String(cleanCount),
    join(tmpDir, "clean-%03d.webp"),
  );
  if (r2.status !== 0) { console.error("Pass 2 failed:\n", r2.stderr); process.exit(1); }

  const cleanFiles = readdirSync(tmpDir).filter(f => f.startsWith("clean-")).sort();
  console.log(`  Extracted ${cleanFiles.length} clean frames.`);

  for (let i = 0; i < cleanFiles.length; i++) {
    const frameNum = cleanStart + i;
    const srcPath  = join(tmpDir, cleanFiles[i]);
    const destName = `${PREFIX}-${String(frameNum).padStart(3, "0")}.webp`;
    const destPath = join(OUT_DIR, destName);
    await sharpenAndEncode(srcPath, destPath);
    if (frameNum % 10 === 0 || frameNum === TOTAL) {
      process.stdout.write(`  [done] ${destName}\n`);
    }
  }

  // Cleanup tmp
  const { rmSync } = await import("fs");
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore EPERM */ }

  const total = readdirSync(OUT_DIR).filter(f => f.endsWith(".webp")).length;
  console.log(`\nDone. ${total} frames in ${OUT_DIR}/`);
  console.log(`\nFilters : ${DENOISE}, ${SHARPEN}`);
  console.log(`Sharp   : sigma=0.7  m1=1.0  m2=5`);
  console.log(`\nTo deploy (stop dev server first):`);
  console.log(`  Remove-Item public\\hero-sequence -Recurse -Force`);
  console.log(`  Rename-Item public\\hero-sequence-hq2 public\\hero-sequence`);
}

main().catch(err => { console.error(err); process.exit(1); });
