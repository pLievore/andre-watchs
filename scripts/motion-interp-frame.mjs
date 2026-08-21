/**
 * Gera um frame intermediário motion-compensated entre dois vizinhos.
 * Usa o filtro `minterpolate` do ffmpeg (modo MCI + AOBMC bidirecional),
 * que estima vetores de movimento e desloca pixels — sem ghost de blend.
 *
 *   node scripts/motion-interp-frame.mjs <target> <a> <b>
 *
 * Exemplo:
 *   node scripts/motion-interp-frame.mjs 14 13 15
 *
 * Requer ffmpeg-static (devDep).
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");

const FRAMES_DIR = "public/hero-sequence";
const PREFIX = "jordan1";

const TARGET = Number(process.argv[2]);
const A = Number(process.argv[3]);
const B = Number(process.argv[4]);

if (!Number.isFinite(TARGET) || !Number.isFinite(A) || !Number.isFinite(B)) {
  console.error("uso: node scripts/motion-interp-frame.mjs <target> <a> <b>");
  process.exit(1);
}

function framePath(i) {
  return path.join(FRAMES_DIR, `${PREFIX}-${String(i).padStart(3, "0")}.webp`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}\n${stderr}`));
    });
  });
}

async function main() {
  const tmpDir = path.join(FRAMES_DIR, ".interp-tmp");
  await fs.mkdir(tmpDir, { recursive: true });
  // limpa runs anteriores
  for (const f of await fs.readdir(tmpDir)) {
    await fs.unlink(path.join(tmpDir, f));
  }

  const aPath = framePath(A);
  const bPath = framePath(B);

  // Setup image2: copia A e B como 001/002 num tmp dir, força framerate input
  // de 2 fps (cada source frame ocupa 0.5s). Source A em t=0, source B em t=0.5.
  // minterpolate fps=4 saída → 4 frames em 1s: t=0, 0.25, 0.5, 0.75.
  // O frame interpolado a 50% entre A e B está em t=0.25 (output 002, 1-based).
  await fs.copyFile(aPath, path.join(tmpDir, "001.webp"));
  await fs.copyFile(bPath, path.join(tmpDir, "002.webp"));

  const inPattern = path.join(tmpDir, "%03d.webp");
  const outPattern = path.join(tmpDir, "out_%03d.webp");

  console.log(`motion-interp: ${PREFIX}-${String(TARGET).padStart(3, "0")} = interpolate(${A}, ${B})`);

  await runFfmpeg([
    "-y",
    "-loglevel", "error",
    "-framerate", "2",
    "-i", inPattern,
    "-vf",
    "minterpolate=fps=4:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
    "-frames:v", "3",
    "-c:v", "libwebp",
    "-quality", "92",
    "-compression_level", "6",
    outPattern,
  ]);

  // out_001 ≈ A, out_002 = 50% motion-interp midpoint, out_003 ≈ B
  const midPath = path.join(tmpDir, "out_002.webp");
  const targetPath = framePath(TARGET);

  // Backup target (preserva o existente)
  const bakPath = path.join(
    FRAMES_DIR,
    `.bak-${PREFIX}-${String(TARGET).padStart(3, "0")}.webp`,
  );
  try {
    await fs.access(bakPath);
    console.log(`backup já existe: ${path.basename(bakPath)}`);
  } catch {
    await fs.copyFile(targetPath, bakPath);
    console.log(`backup criado: ${path.basename(bakPath)}`);
  }

  const buf = await fs.readFile(midPath);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.writeFile(targetPath, buf);
      break;
    } catch (err) {
      if (attempt === 4 || (err.code !== "EPERM" && err.code !== "EBUSY")) throw err;
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // cleanup tmp
  for (const f of await fs.readdir(tmpDir)) {
    await fs.unlink(path.join(tmpDir, f));
  }
  await fs.rmdir(tmpDir);

  console.log(`escrito: ${targetPath}  (size: ${(buf.length / 1024).toFixed(1)}KB)`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
