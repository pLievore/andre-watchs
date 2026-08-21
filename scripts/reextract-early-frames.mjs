/**
 * reextract-early-frames.mjs
 *
 * Re-extracts frames 001-014 directly from veo3_output.mp4 with the same
 * cropdetect + scale pipeline used for the rest of the sequence.
 * This replaces the product-photo placeholders with proper video frames so
 * the zoom/framing is consistent across all 72 frames.
 *
 * Usage:
 *   node scripts/reextract-early-frames.mjs
 *   node scripts/reextract-early-frames.mjs --video=path/to/other.mp4
 *   node scripts/reextract-early-frames.mjs --dry-run
 */

import { execFileSync, spawnSync } from "child_process";
import { createRequire } from "module";
import { existsSync, mkdirSync, renameSync, unlinkSync, readdirSync } from "fs";
import { join, resolve } from "path";

const require = createRequire(import.meta.url);
const ffmpegBin = require("ffmpeg-static");

// ─── Config ──────────────────────────────────────────────────────────────────
const DEFAULT_VIDEO = "veo3_output.mp4";
const FRAMES_DIR    = "public/hero-sequence";
const STAGING_DIR   = "public/hero-sequence-reextract";
const PREFIX        = "jordan1";
const TOTAL_FRAMES  = 72;
const REEXTRACT_END = 14;   // replace frames 1..N from the video
const WIDTH         = 1600;
const QUALITY       = 90;   // WebP quality (0-100)
const CROP_THRESHOLD = 24;  // black-level threshold for cropdetect
// ─────────────────────────────────────────────────────────────────────────────

function ffmpeg(...args) {
  return spawnSync(ffmpegBin, args, { encoding: "utf8" });
}

function parseArgs() {
  const map = Object.fromEntries(
    process.argv.slice(2)
      .filter(a => a.startsWith("--"))
      .map(a => { const [k, v] = a.replace("--", "").split("="); return [k, v ?? true]; }),
  );
  return {
    video:  map.video  ?? DEFAULT_VIDEO,
    dryRun: !!map["dry-run"],
  };
}

/** Run cropdetect over the entire video and return the stable crop spec. */
function detectCrop(videoPath) {
  console.log("Running cropdetect on video…");
  const result = ffmpeg(
    "-hide_banner", "-nostats",
    "-i", videoPath,
    "-vf", `cropdetect=${CROP_THRESHOLD}:16:0`,
    "-frames:v", "120",
    "-f", "null", "NUL",
  );

  // cropdetect writes to stderr
  const output = result.stderr ?? "";
  const matches = [...output.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)];
  if (!matches.length) return null;

  // Use the last (most stable) detected crop value
  return matches[matches.length - 1][1];
}

/** Get total frame count and duration from the video. */
function probeDuration(videoPath) {
  const result = ffmpeg(
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=duration,nb_frames",
    "-of", "default=noprint_wrappers=1:nokey=1",
    "-i", videoPath,
  );
  // Note: ffprobe is separate but ffmpeg -i also prints duration info
  // Use a simpler approach: get duration via ffmpeg stderr
  const probe = spawnSync(ffmpegBin, ["-v", "quiet", "-print_format", "json",
    "-show_streams", "-i", videoPath], { encoding: "utf8" });
  // fallback: we know TOTAL_FRAMES and can derive fps from the video
  return null;
}

async function main() {
  const { video, dryRun } = parseArgs();

  if (!existsSync(video)) {
    console.error(`Video not found: ${resolve(video)}`);
    process.exit(1);
  }

  if (dryRun) console.log("DRY RUN — no files will be written\n");

  // 1. Detect crop
  const cropSpec = detectCrop(video);
  if (cropSpec) {
    console.log(`Detected crop    : ${cropSpec}`);
  } else {
    console.log("No letterbox detected — using full frame.");
  }

  // 2. Get video duration to derive fps for TOTAL_FRAMES
  const probeResult = spawnSync(ffmpegBin, [
    "-v", "error", "-i", video, "-f", "null", "NUL",
  ], { encoding: "utf8" });

  // Parse duration from ffmpeg stderr ("Duration: HH:MM:SS.ss")
  const durMatch = (probeResult.stderr ?? "").match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  let fps = 9; // default from SPEC
  if (durMatch) {
    const duration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3]);
    fps = TOTAL_FRAMES / duration;
    console.log(`Duration         : ${duration.toFixed(3)}s → fps=${fps.toFixed(6)}`);
  }

  // 3. Build the ffmpeg video filter
  const cropFilter = cropSpec ? `crop=${cropSpec},` : "";
  const vf = `${cropFilter}fps=${fps},scale=${WIDTH}:-1:flags=lanczos`;
  console.log(`Video filter     : ${vf}`);
  console.log(`Replacing frames : 001–${String(REEXTRACT_END).padStart(3, "0")}`);
  console.log(`Quality          : WebP q${QUALITY}`);
  console.log(`Output staging   : ${STAGING_DIR}/`);
  console.log("");

  if (dryRun) return;

  // 4. Extract all TOTAL_FRAMES into staging
  mkdirSync(STAGING_DIR, { recursive: true });
  const outPattern = join(STAGING_DIR, `${PREFIX}-%03d.webp`);

  console.log("Extracting frames from video…");
  const extractResult = spawnSync(ffmpegBin, [
    "-y", "-loglevel", "error",
    "-i", video,
    "-vf", vf,
    "-c:v", "libwebp",
    "-compression_level", "6",
    "-quality", String(QUALITY),
    "-preset", "picture",
    "-loop", "0",
    "-an",
    "-frames:v", String(TOTAL_FRAMES),
    outPattern,
  ], { encoding: "utf8" });

  if (extractResult.status !== 0) {
    console.error("ffmpeg failed:");
    console.error(extractResult.stderr);
    process.exit(1);
  }

  const extracted = readdirSync(STAGING_DIR).filter(f => f.endsWith(".webp")).length;
  console.log(`Extracted ${extracted} frames from video.`);

  // 5. Copy frames REEXTRACT_END+1 … TOTAL_FRAMES from the current hero-sequence
  //    (these are already at q90, no reason to re-encode)
  const { copyFileSync } = await import("fs");
  for (let i = REEXTRACT_END + 1; i <= TOTAL_FRAMES; i++) {
    const name = `${PREFIX}-${String(i).padStart(3, "0")}.webp`;
    const src  = join(FRAMES_DIR, name);
    const dest = join(STAGING_DIR, name);
    if (!existsSync(dest) && existsSync(src)) {
      copyFileSync(src, dest);
      process.stdout.write(`  [kept ] ${name}\n`);
    }
  }

  console.log(`\nDone. Staging: ${STAGING_DIR}/`);
  console.log("\nTo apply (stop dev server first):");
  console.log("  Remove-Item public\\hero-sequence -Recurse -Force");
  console.log("  Rename-Item public\\hero-sequence-reextract public\\hero-sequence");
}

main().catch(err => { console.error(err); process.exit(1); });
