/**
 * Cria miniatura e desfoque para as fotos que já estavam no bucket.
 *
 *   node scripts/gerar-miniaturas.mjs           # roda de verdade
 *   node scripts/gerar-miniaturas.mjs --simular # só lista o que faria
 *
 * A partir da fase 13 toda foto enviada nasce com as três formas (original,
 * miniatura de 1000px e desfoque embutido), geradas no navegador. Quem já
 * estava no acervo, não — e são justamente essas que o cliente vê hoje. Este
 * script fecha essa lacuna uma vez.
 *
 * Idempotente: pula foto que já tem miniatura. Pode rodar de novo depois de
 * uma importação em massa.
 *
 * As fotos de semente (`/pecas/...`) ficam de fora: são arquivos locais
 * servidos pelo Next, não objetos do Storage, e o `next/image` já lida com
 * elas.
 */

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Em produção as variáveis já vêm do ambiente.
  }
}

const simular = process.argv.includes("--simular");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

/** Mesmos números do navegador — ver `pecas/fotos-config.ts`. */
const LARGURA_THUMB = 1000;
const QUALIDADE_THUMB = 82;
const LARGURA_BLUR = 20;

function caminhoDaMiniatura(caminho) {
  return `${caminho.replace(/\.[^.]+$/, "")}.thumb.webp`;
}

function ehObjetoDoBucket(url) {
  return Boolean(url) && !url.startsWith("/") && !/^https?:\/\//i.test(url);
}

const { data: fotos, error } = await db
  .from("fotos")
  .select("id, url, url_thumb, blur")
  .order("peca_id", { ascending: true });

if (error) {
  console.error("Falha ao listar fotos:", error.message);
  process.exit(1);
}

const pendentes = (fotos ?? []).filter(
  (f) => ehObjetoDoBucket(f.url) && (!f.url_thumb || !f.blur),
);

console.log(
  `${fotos?.length ?? 0} fotos no banco · ${pendentes.length} sem miniatura ou desfoque.`,
);

if (simular) {
  for (const f of pendentes) console.log(`  faria: ${f.url}`);
  process.exit(0);
}

let feitas = 0;
let falhas = 0;

for (const foto of pendentes) {
  try {
    const { data: arquivo, error: erroDownload } = await db.storage
      .from("pecas")
      .download(foto.url);

    if (erroDownload || !arquivo) {
      throw new Error(erroDownload?.message ?? "download vazio");
    }

    const original = Buffer.from(await arquivo.arrayBuffer());

    const miniatura = await sharp(original)
      .rotate() // respeita o EXIF antes de redimensionar
      .resize({ width: LARGURA_THUMB, withoutEnlargement: true })
      .webp({ quality: QUALIDADE_THUMB })
      .toBuffer();

    const desfoque = await sharp(original)
      .rotate()
      .resize({ width: LARGURA_BLUR })
      .webp({ quality: 50 })
      .toBuffer();

    const caminhoThumb = caminhoDaMiniatura(foto.url);

    const { error: erroUpload } = await db.storage
      .from("pecas")
      .upload(caminhoThumb, miniatura, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: true,
      });

    if (erroUpload) throw new Error(erroUpload.message);

    const { error: erroUpdate } = await db
      .from("fotos")
      .update({
        url_thumb: caminhoThumb,
        blur: `data:image/webp;base64,${desfoque.toString("base64")}`,
      })
      .eq("id", foto.id);

    if (erroUpdate) throw new Error(erroUpdate.message);

    feitas++;
    const antes = (original.length / 1024).toFixed(0);
    const depois = (miniatura.length / 1024).toFixed(0);
    console.log(`  ✓ ${foto.url} — ${antes} kB → ${depois} kB`);
  } catch (erro) {
    falhas++;
    console.error(`  ✗ ${foto.url}: ${erro.message}`);
  }
}

console.log(`\n${feitas} miniaturas criadas${falhas ? `, ${falhas} falharam` : ""}.`);
