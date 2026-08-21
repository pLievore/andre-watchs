import sharp from "sharp";
import fs from "fs";

// Faixa que o scrim cobre e onde a copy mora: metade inferior da tela.
const REGION = { top: 0.50, height: 0.50 };

async function build(dir, prefix, count) {
  return buildFrom(`public/${dir}`, prefix, count);
}

async function buildFrom(base, prefix, count) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    const f = `${base}/${prefix}-${String(i).padStart(3, "0")}.webp`;
    const meta = await sharp(f).metadata();
    const { data } = await sharp(f)
      .extract({
        left: 0,
        top: Math.round(meta.height * REGION.top),
        width: meta.width,
        height: Math.round(meta.height * REGION.height),
      })
      .greyscale()
      .resize(64)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let s = 0;
    for (let p = 0; p < data.length; p++) s += data[p];
    out.push(Math.round(s / data.length));
  }
  return out;
}

/**
 * O mobile não tem sequência de arquivos: toca um `<video>`. Extraímos quadros
 * dele num diretório temporário só pra medir — a tabela precisa descrever o que
 * está NA TELA, e o vídeo é recortado em 3:4, então medir a fonte 16:9 daria
 * valores que não correspondem.
 */
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import ffmpeg from "ffmpeg-static";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "luma-"));
execFileSync(ffmpeg, ["-loglevel", "error", "-y", "-i", "public/hero-mobile.mp4",
  "-vf", "fps=15", "-c:v", "libwebp", "-quality", "80", "-f", "image2",
  path.join(tmp, "m-%03d.webp")]);
const mobileCount = fs.readdirSync(tmp).filter((f) => f.endsWith(".webp")).length;

const desktop = await build("hero-sequence", "aw-hero", 361);
const mobile = await buildFrom(tmp, "m", mobileCount);
// Limpeza é oportunista: no Windows o diretório pode continuar travado pelo
// processo do ffmpeg que acabou de sair, e isso não pode derrubar a geração.
try {
  fs.rmSync(tmp, { recursive: true, force: true });
} catch {
  /* diretório temporário fica pro sistema recolher */
}

const stat = (a) => `${Math.min(...a)}–${Math.max(...a)}`;
const body = `/**
 * Luminância média (0–255) da METADE INFERIOR de cada quadro — a área que o
 * scrim cobre e onde a copy do hero mora.
 *
 * Gerado offline por \`scripts/build-luminance.mjs\`. Existe para o scrim se
 * ajustar quadro a quadro sem custo em runtime: medir isto no browser exigiria
 * ler pixels do canvas a cada frame, o que trava o pipeline da GPU.
 *
 * Amplitude medida — desktop ${stat(desktop)}, mobile ${stat(mobile)}. É essa
 * variação que torna um scrim de opacidade fixa inviável: o que segura o texto
 * no quadro claro afunda o quadro escuro em breu.
 */
export const LUMA_DESKTOP: readonly number[] = [
${desktop.join(",")}
];

export const LUMA_MOBILE: readonly number[] = [
${mobile.join(",")}
];
`;
fs.writeFileSync("src/lib/hero-luma.ts", body);
console.log(`desktop ${desktop.length} valores, faixa ${stat(desktop)}`);
console.log(`mobile  ${mobile.length} valores, faixa ${stat(mobile)}`);
console.log(`arquivo: ${(fs.statSync("src/lib/hero-luma.ts").size / 1024).toFixed(1)} KB`);
