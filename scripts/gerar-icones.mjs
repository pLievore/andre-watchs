/**
 * Ícones do site, a partir do monograma da marca.
 *
 *   node scripts/gerar-icones.mjs
 *
 * O SVG do monograma é traço puro sobre transparência. Ícone de aplicativo não
 * pode ser transparente — no iOS ele vira um borrão preto na tela de início —,
 * então aqui ele é composto sobre o papel osso da casa, com margem, e virado
 * em PNG nos tamanhos que cada lugar pede:
 *
 *   src/app/apple-icon.png    180  tela de início do iPhone
 *   public/icons/icon-192.png 192  manifesto (Android e atalho)
 *   public/icons/icon-512.png 512  manifesto (splash e loja de PWA)
 *
 * O favicon fica em `src/app/icon.svg`, cópia direta do monograma: vetor não
 * borra em nenhuma densidade de tela.
 *
 * Rodar de novo é seguro — os arquivos são reescritos.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

const PAPEL = "#faf8f4";
const TINTA = "#17181a";

/** O monograma em tinta, com o traço um pouco mais forte para não sumir no ícone pequeno. */
const monograma = readFileSync(join(raiz, "public/brand/monograma-tinta.svg"), "utf8")
  .replace('stroke-width="1.5"', 'stroke-width="1.7"')
  .replace(/width="24" height="24"/, "");

/** Compõe o monograma centralizado sobre o papel, com margem de respiro. */
function arte(lado) {
  const margem = Math.round(lado * 0.18);
  const interno = lado - margem * 2;
  const svg = monograma
    .replace("<svg", `<svg width="${interno}" height="${interno}"`)
    .replace(/stroke="#17181a"/, `stroke="${TINTA}"`);

  return sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: PAPEL,
    },
  }).composite([
    { input: Buffer.from(svg), top: margem, left: margem },
  ]);
}

async function gerar(lado, destino) {
  const caminho = join(raiz, destino);
  mkdirSync(dirname(caminho), { recursive: true });
  await arte(lado).png().toFile(caminho);
  console.log(`✓ ${destino} (${lado}px)`);
}

// O favicon é o próprio vetor — nada a rasterizar.
const icone = readFileSync(join(raiz, "public/brand/monograma-tinta.svg"), "utf8");
writeFileSync(join(raiz, "src/app/icon.svg"), icone);
console.log("✓ src/app/icon.svg (vetor)");

await gerar(180, "src/app/apple-icon.png");
await gerar(192, "public/icons/icon-192.png");
await gerar(512, "public/icons/icon-512.png");
