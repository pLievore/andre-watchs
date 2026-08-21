/**
 * extract-all-frames.mjs
 *
 * Extracts all 72 frames from veo3_output.mp4, handling the fact that the
 * video's first few frames have black letterbox bars while the rest do not.
 *
 * Strategy:
 *   • Frames 1-BAR_END : extracted with bar-crop (1072:720:104:0), scaled to
 *     CONTENT_WIDTH, then padded to WIDTH×HEIGHT with a background color
 *     sampled from frame BAR_END+1 (so the padding blends with the cinematic
 *     warm-gray background that dominates the rest of the sequence).
 *   • Frames BAR_END+1 … TOTAL_FRAMES : extracted with no crop, scaled to
 *     WIDTH×HEIGHT — they already fill the full frame.
 *
 * The bar boundaries were found via cropdetect -frames:v 14:
 *   crop=1072:720:104:0  (104px bars on each side of the 1280×720 video frame)
 *
 * Usage:
 *   node scripts/extract-all-frames.mjs [--dry-run]
 */

import { spawnSync } from "child_process";
import { createRequire } from "module";
import { existsSync, mkdirSync, readdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const ffmpegBin = require("ffmpeg-static");

// ─── Config ──────────────────────────────────────────────────────────────────
const VIDEO       = "veo3_output.mp4";
const STAGING_DIR = "public/hero-sequence-final";
const PREFIX      = "jordan1";
const TOTAL_FRAMES = 72;
const BAR_END     = 4;          // frames 1-4 have bars (detected via cropdetect)
const WIDTH       = 1600;
const HEIGHT      = 900;
const QUALITY     = 90;

// Known bar-crop spec from cropdetect (crop=W:H:X:Y)
const BAR_CROP_W  = 1072;
const BAR_CROP_H  = 720;
const BAR_CROP_X  = 104;
const BAR_CROP_Y  = 0;

// Scale factor for clean frames: 1280→1600 = ×1.25
// Scale for bar frames: crop to 1072, scale to match SAME shoe size as clean frames
// Clean frames: 1280px wide source → 1600px target  (zoom = 1600/1280 = 1.25)
// Bar frames:   1072px wide source → to keep same zoom we scale to 1600*(1072/1280) = 1340px content
//               then pad to 1600×900 with matched background
const BAR_CONTENT_W = Math.round(WIDTH * BAR_CROP_W / 1280); // 1340
// ─────────────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes("--dry-run");

function ffmpeg(...args) {
  return spawnSync(ffmpegBin, args, { encoding: "utf8" });
}

/** Probe video to get fps / duration */
function probeFPS() {
  const r = ffmpeg("-v", "error", "-i", VIDEO, "-f", "null", "NUL");
  const m = (r.stderr ?? "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return 9;
  const dur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  return TOTAL_FRAMES / dur;
}

/** Sample the dominant background color from the first clean (no-bar) frame */
async function sampleBackground(framePath) {
  const img = sharp(framePath);
  const { width, height } = await img.metadata();

  // Sample three horizontal strips near the top, left edge (background region)
  const regions = [
    { left: 0,   top: 20,  width: 60, height: 40 },
    { left: 0,   top: 100, width: 60, height: 40 },
    { left: width - 60, top: 20, width: 60, height: 40 },
  ];

  const samples = await Promise.all(regions.map(async r => {
    const buf = await sharp(framePath).extract(r).raw().toBuffer();
    let R = 0, G = 0, B = 0;
    for (let i = 0; i < buf.length; i += 3) { R += buf[i]; G += buf[i+1]; B += buf[i+2]; }
    const n = buf.length / 3;
    return { r: Math.round(R/n), g: Math.round(G/n), b: Math.round(B/n) };
  }));

  const r = Math.round(samples.reduce((a, s) => a + s.r, 0) / samples.length);
  const g = Math.round(samples.reduce((a, s) => a + s.g, 0) / samples.length);
  const b = Math.round(samples.reduce((a, s) => a + s.b, 0) / samples.length);
  return { r, g, b };
}

async function main() {
  if (!existsSync(VIDEO)) {
    console.error(`Video not found: ${resolve(VIDEO)}`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log("DRY RUN — no files will be written\n");
    console.log(`Bar-affected frames : 001–${String(BAR_END).padStart(3,"0")}`);
    console.log(`Bar crop spec       : crop=${BAR_CROP_W}:${BAR_CROP_H}:${BAR_CROP_X}:${BAR_CROP_Y}`);
    console.log(`Bar-frame content W : ${BAR_CONTENT_W}px (matches zoom of clean frames)`);
    console.log(`Clean frames        : ${String(BAR_END+1).padStart(3,"0")}–072 → scale=${WIDTH}:-1`);
    console.log(`Output staging      : ${STAGING_DIR}/`);
    return;
  }

  const fps = probeFPS();
  console.log(`Video fps: ${fps.toFixed(4)}`);
  mkdirSync(STAGING_DIR, { recursive: true });

  // ── Pass 1: Extract ALL 72 frames WITHOUT any crop (clean pass)
  //    These give us the correct shoe framing for frames 5-72.
  //    Frames 1-4 from this pass will have bars but we'll replace them in step 3.
  console.log("\nPass 1: Extracting all 72 frames (no crop)…");
  const cleanPattern = join(STAGING_DIR, `${PREFIX}-%03d.webp`);
  const p1 = spawnSync(ffmpegBin, [
    "-y", "-loglevel", "error",
    "-i", VIDEO,
    "-vf", `fps=${fps},scale=${WIDTH}:-1:flags=lanczos`,
    "-c:v", "libwebp", "-compression_level", "6",
    "-quality", String(QUALITY),
    "-preset", "picture", "-loop", "0", "-an",
    "-frames:v", String(TOTAL_FRAMES),
    cleanPattern,
  ], { encoding: "utf8" });

  if (p1.status !== 0) {
    console.error("Pass 1 failed:\n", p1.stderr);
    process.exit(1);
  }
  const cleanCount = readdirSync(STAGING_DIR).filter(f => f.endsWith(".webp")).length;
  console.log(`  Extracted ${cleanCount} frames.`);

  // ── Pass 2: Extract frames 1-BAR_END with bar-crop applied,
  //    scale to BAR_CONTENT_W (same effective shoe zoom as clean frames),
  //    then pad to WIDTH×HEIGHT with the sampled background color.
  console.log(`\nPass 2: Re-extracting frames 1–${BAR_END} with bar-crop + matched padding…`);

  // Sample background from the first clean frame (BAR_END+1)
  const firstCleanPath = join(STAGING_DIR, `${PREFIX}-${String(BAR_END+1).padStart(3,"0")}.webp`);
  const bg = await sampleBackground(firstCleanPath);
  console.log(`  Background color sampled from frame ${BAR_END+1}: rgb(${bg.r},${bg.g},${bg.b})`);

  // Extract bar frames with crop to a temp staging dir
  const tmpDir = STAGING_DIR + "-barframes";
  mkdirSync(tmpDir, { recursive: true });
  const barPattern = join(tmpDir, `${PREFIX}-%03d.webp`);

  const p2 = spawnSync(ffmpegBin, [
    "-y", "-loglevel", "error",
    "-i", VIDEO,
    "-vf", `fps=${fps},crop=${BAR_CROP_W}:${BAR_CROP_H}:${BAR_CROP_X}:${BAR_CROP_Y},scale=${BAR_CONTENT_W}:-1:flags=lanczos`,
    "-c:v", "libwebp", "-compression_level", "6",
    "-quality", String(QUALITY),
    "-preset", "picture", "-loop", "0", "-an",
    "-frames:v", String(BAR_END),
    barPattern,
  ], { encoding: "utf8" });

  if (p2.status !== 0) {
    console.error("Pass 2 failed:\n", p2.stderr);
    process.exit(1);
  }
  const barCount = readdirSync(tmpDir).filter(f => f.endsWith(".webp")).length;
  console.log(`  Extracted ${barCount} bar frames.`);

  // ── Step 3: Pad bar frames to WIDTH×HEIGHT and write to staging
  console.log(`\nStep 3: Padding bar frames to ${WIDTH}×${HEIGHT}…`);
  for (let i = 1; i <= BAR_END; i++) {
    const name     = `${PREFIX}-${String(i).padStart(3,"0")}.webp`;
    const srcPath  = join(tmpDir, name);
    const destPath = join(STAGING_DIR, name);

    if (!existsSync(srcPath)) {
      console.warn(`  [WARN] bar frame not found: ${srcPath}`);
      continue;
    }

    const { width: srcW, height: srcH } = await sharp(srcPath).metadata();
    const padLeft = Math.round((WIDTH - srcW) / 2);
    const padTop  = Math.round((HEIGHT - srcH) / 2);

    await sharp(srcPath)
      .extend({
        top:    padTop,
        bottom: HEIGHT - srcH - padTop,
        left:   padLeft,
        right:  WIDTH - srcW - padLeft,
        background: bg,
      })
      .webp({ quality: QUALITY })
      .toFile(destPath);

    console.log(`  [fixed] ${name}  (${srcW}×${srcH} → ${WIDTH}×${HEIGHT}, pad=${padLeft}px)`);
  }

  // Cleanup temp dir
  const { rmSync } = await import("fs");
  rmSync(tmpDir, { recursive: true, force: true });

  const total = readdirSync(STAGING_DIR).filter(f => f.endsWith(".webp")).length;
  console.log(`\nDone. ${total} frames in ${STAGING_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-final public\\hero-sequence");
}

main().catch(err => { console.error(err); process.exit(1); });
