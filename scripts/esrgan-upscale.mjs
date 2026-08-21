/**
 * esrgan-upscale.mjs  —  AI upscale hero frames using Real-ESRGAN.
 *
 * Pipeline per frame:
 *   1. Extract from video as PNG (native 1280×720 or 1072×720 bar-crop)
 *   2. Real-ESRGAN 4× upscale  →  5120×2880 (or 4288×2880 bar)
 *   3. sharp downscale →  1600×900  (clean) | 1340×900 + pad  (bar)
 *   4. WebP q95  →  public/hero-sequence/
 *
 * Usage:
 *   node scripts/esrgan-upscale.mjs            # full run
 *   node scripts/esrgan-upscale.mjs --test     # 1 bar + 1 clean frame (timing test)
 *   node scripts/esrgan-upscale.mjs --dry-run  # print config, no processing
 */

import { spawnSync }                                      from "child_process";
import { createRequire }                                  from "module";
import { existsSync, mkdirSync, readdirSync, rmSync }     from "fs";
import { join, resolve }                                  from "path";
import sharp                                              from "sharp";

const require    = createRequire(import.meta.url);
const ffmpegBin  = require("ffmpeg-static");

// ─── Config ───────────────────────────────────────────────────────────────────
const VIDEO      = "veo3_output.mp4";
const OUT_DIR    = "public/hero-sequence";
const PREFIX     = "jordan1";
const TOTAL      = 72;
const BAR_END    = 13;           // frames 1–13 have black bars
const WIDTH      = 1600;
const HEIGHT     = 900;
const QUALITY    = 95;
const FPS_FALL   = 9;            // fallback if probe fails

// Known bar-crop geometry (cropdetect output from source video)
const CROP_W     = 1072;
const CROP_H     = 720;
const CROP_X     = 104;
/** Width of bar-content after ESRGAN+downscale (same proportion as clean frames) */
const CONTENT_W  = Math.round(WIDTH * CROP_W / 1280);    // 1340

// Real-ESRGAN configuration
const HOME          = process.env.USERPROFILE ?? process.env.HOME;
const ESRGAN_PY     = resolve("scripts/realesrgan_dml.py");   // custom DML script
const MODEL_NAME    = "realesr-general-wdn-x4v3";
const MODEL_PATH    = resolve(HOME, "Downloads/realesr-general-wdn-x4v3.pth");
const ESRGAN_SUFFIX = "out";     // inference script adds _out to output filenames
const ESRGAN_DEVICE = "cpu";     // RX 560 too old for DML tensor ops; CPU ~30s/frame

const isDryRun  = process.argv.includes("--dry-run");
const isTest    = process.argv.includes("--test");   // process 1 bar + 1 clean only

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ffmpeg(...args) {
  return spawnSync(ffmpegBin, args, { encoding: "utf8" });
}

function probeFPS() {
  const r = ffmpeg("-v", "error", "-i", VIDEO, "-f", "null", "NUL");
  const m = (r.stderr ?? "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return FPS_FALL;
  const dur = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
  return TOTAL / dur;
}

/** Sample average colour from each horizontal edge (top 100 px). */
async function sampleSideColors(imgPath) {
  const { width, height } = await sharp(imgPath).metadata();
  const sliceH = Math.min(height, 100);
  const STRIP  = 25;

  async function mean(region) {
    const buf = await sharp(imgPath).extract(region).raw().toBuffer();
    let R = 0, G = 0, B = 0;
    const n = buf.length / 3;
    for (let i = 0; i < buf.length; i += 3) { R += buf[i]; G += buf[i + 1]; B += buf[i + 2]; }
    return { r: Math.round(R / n), g: Math.round(G / n), b: Math.round(B / n) };
  }

  const leftColor  = await mean({ left: 0,              top: 0, width: STRIP, height: sliceH });
  const rightColor = await mean({ left: width - STRIP,  top: 0, width: STRIP, height: sliceH });
  return { leftColor, rightColor };
}

/** Resize a PNG, add edge-matched padding, convert to WebP. */
async function barFrameToWebP(srcPath, destPath) {
  // Step 1: downscale 4288×2880 → CONTENT_W×HEIGHT (1340×900) as PNG buffer
  const resizedBuf = await sharp(srcPath)
    .resize(CONTENT_W, HEIGHT, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer();

  // Step 2: sample edge colors from the resized content
  const tmpResized = srcPath + "_resized.png";
  await sharp(resizedBuf).toFile(tmpResized);
  const { leftColor, rightColor } = await sampleSideColors(tmpResized);
  rmSync(tmpResized, { force: true });

  const padLeft  = Math.round((WIDTH - CONTENT_W) / 2);
  const padRight = WIDTH - CONTENT_W - padLeft;

  // Step 3: build right-edge strip in right edge color
  const rightStrip = await sharp({
    create: { width: padRight, height: HEIGHT, channels: 3, background: rightColor },
  }).png().toBuffer();

  // Step 4: composite: left background + right strip + content
  await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: leftColor } })
    .composite([
      { input: rightStrip,  left: padLeft + CONTENT_W, top: 0 },
      { input: resizedBuf,  left: padLeft,              top: 0 },
    ])
    .webp({ quality: QUALITY })
    .toFile(destPath);

  return { leftColor, rightColor };
}

/** Downscale upscaled PNG to 1600×900 and convert to WebP. */
async function cleanFrameToWebP(srcPath, destPath) {
  await sharp(srcPath)
    .resize(WIDTH, HEIGHT, { fit: "fill", kernel: "lanczos3" })
    .webp({ quality: QUALITY })
    .toFile(destPath);
}

/** Run Real-ESRGAN on a folder of PNGs. Shows live output. */
function runEsrgan(inputDir, outputDir) {
  const start = Date.now();
  console.log(`  ESRGAN ← ${inputDir}`);
  console.log(`         → ${outputDir}`);

  const result = spawnSync(
    "python",
    [
      ESRGAN_PY,
      "-i",  inputDir,
      "-o",  outputDir,
      "-n",  MODEL_NAME,
      "--model_path", MODEL_PATH,
      "--device",    ESRGAN_DEVICE,
      "--fp32",               // fp32 for stability (DirectML handles fp16 poorly on some GPUs)
      "--tile",      "256",   // smaller tile = less VRAM (RX 560 has 4 GB)
      "--tile_pad",  "32",
      "--outscale",  "4",
      "--denoise_strength", "0.5",
      "--suffix",    ESRGAN_SUFFIX,
    ],
    { encoding: "utf8", stdio: ["ignore", "inherit", "inherit"], timeout: 7_200_000 }
  );

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (result.status !== 0) {
    console.error(`ESRGAN exited with status ${result.status} after ${elapsed}s`);
    process.exit(1);
  }
  console.log(`  Done in ${elapsed}s`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(VIDEO)) {
    console.error("Video not found:", resolve(VIDEO));
    process.exit(1);
  }
  if (!existsSync(ESRGAN_PY)) {
    console.error("Real-ESRGAN script not found:", ESRGAN_PY);
    process.exit(1);
  }
  if (!existsSync(MODEL_PATH)) {
    console.error("Model file not found:", MODEL_PATH);
    process.exit(1);
  }

  const fps      = probeFPS();
  const barCount = isTest ? 1 : BAR_END;
  const clnCount = isTest ? 1 : TOTAL - BAR_END;

  console.log(`\n══ Real-ESRGAN hero frame upscaler ══`);
  console.log(`Video FPS   : ${fps.toFixed(4)}`);
  console.log(`Model       : ${MODEL_NAME}`);
  console.log(`Device      : ${ESRGAN_DEVICE}`);
  console.log(`Bar frames  : 001–${String(barCount).padStart(3, "0")}  (crop ${CROP_W}×${CROP_H} → 4× → ${CONTENT_W}×${HEIGHT} + pad)`);
  console.log(`Clean frames: ${String(BAR_END + 1).padStart(3, "0")}–${String(BAR_END + clnCount).padStart(3, "0")}  (1280×720 → 4× → ${WIDTH}×${HEIGHT})`);
  console.log(`Output      : ${OUT_DIR}/`);
  if (isTest)   console.log(`TEST MODE   : 1 bar + 1 clean frame only`);
  if (isDryRun) { console.log("\nDRY RUN — exiting."); return; }

  // Temp directory layout
  const tmpDir      = "tmp-esrgan";
  const barRawDir   = join(tmpDir, "bar-frames");
  const clnRawDir   = join(tmpDir, "clean-frames");
  const barUpDir    = join(tmpDir, "bar-upscaled");
  const clnUpDir    = join(tmpDir, "clean-upscaled");

  for (const d of [barRawDir, clnRawDir, barUpDir, clnUpDir]) {
    mkdirSync(d, { recursive: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  // ── Phase 1: Extract bar-cropped frames (1–BAR_END) ──────────────────────
  console.log(`\n[1/4] Extracting ${barCount} bar-cropped frames (${CROP_W}×${CROP_H})…`);
  {
    const vf = `crop=${CROP_W}:${CROP_H}:${CROP_X}:0,fps=${fps}`;
    const r = ffmpeg(
      "-i", VIDEO,
      "-vf", vf,
      "-frames:v", String(barCount),
      "-pix_fmt", "rgb24",
      join(barRawDir, `${PREFIX}_%03d.png`), "-y"
    );
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(`  Saved ${barCount} frames to ${barRawDir}`);
  }

  // ── Phase 2: Extract clean frames (BAR_END+1–72) ─────────────────────────
  console.log(`[2/4] Extracting ${clnCount} clean frames (1280×720)…`);
  {
    // Use select filter to skip first BAR_END frames (0-based index)
    const vf = `select='gte(n\\,${BAR_END})',fps=${fps},setpts=N/FRAME_RATE/TB`;
    const r = ffmpeg(
      "-i", VIDEO,
      "-vf", vf,
      "-frames:v", String(clnCount),
      "-vsync", "vfr",
      "-pix_fmt", "rgb24",
      join(clnRawDir, `${PREFIX}_%03d.png`), "-y"
    );
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log(`  Saved ${clnCount} frames to ${clnRawDir}`);
  }

  // ── Phase 3: Real-ESRGAN upscaling ───────────────────────────────────────
  console.log(`\n[3/4] Real-ESRGAN upscaling (CPU — be patient)…`);

  console.log(`\nBatch 1: bar frames`);
  runEsrgan(resolve(barRawDir), resolve(barUpDir));

  console.log(`\nBatch 2: clean frames`);
  runEsrgan(resolve(clnRawDir), resolve(clnUpDir));

  // ── Phase 4: Post-process to WebP ────────────────────────────────────────
  console.log(`\n[4/4] Converting upscaled PNGs → WebP…`);

  // Bar frames: upscaled filenames are like jordan1_001_out.png
  const barFiles = readdirSync(barUpDir)
    .filter(f => f.endsWith(`_${ESRGAN_SUFFIX}.png`))
    .sort();

  for (let i = 0; i < barFiles.length; i++) {
    const frameNum = i + 1;
    const num      = String(frameNum).padStart(3, "0");
    const srcPath  = join(barUpDir, barFiles[i]);
    const destPath = join(OUT_DIR, `${PREFIX}_${num}.webp`);
    const { leftColor, rightColor } = await barFrameToWebP(srcPath, destPath);
    console.log(`  ✓ ${PREFIX}_${num}.webp  L=rgb(${leftColor.r},${leftColor.g},${leftColor.b}) R=rgb(${rightColor.r},${rightColor.g},${rightColor.b})`);
  }

  // Clean frames
  const clnFiles = readdirSync(clnUpDir)
    .filter(f => f.endsWith(`_${ESRGAN_SUFFIX}.png`))
    .sort();

  for (let i = 0; i < clnFiles.length; i++) {
    const frameNum = BAR_END + 1 + i;
    const num      = String(frameNum).padStart(3, "0");
    const srcPath  = join(clnUpDir, clnFiles[i]);
    const destPath = join(OUT_DIR, `${PREFIX}_${num}.webp`);
    await cleanFrameToWebP(srcPath, destPath);
    console.log(`  ✓ ${PREFIX}_${num}.webp`);
  }

  // Clean up tmp dir
  console.log(`\nCleaning up ${tmpDir}/…`);
  try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  console.log(`\n✓ Done! ${OUT_DIR}/ updated with ${barFiles.length + clnFiles.length} frames.`);
}

main().catch(err => { console.error(err); process.exit(1); });
