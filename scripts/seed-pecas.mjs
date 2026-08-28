/**
 * Semente do catálogo — leva as peças de src/lib/data/watches.ts para o banco.
 *
 *   node scripts/seed-pecas.mjs
 *
 * IDEMPOTENTE: usa `slug` como chave. Rodar de novo atualiza em vez de
 * duplicar, então dá pra corrigir o mock e semear outra vez sem limpar nada.
 *
 * Usa a chave secret porque escrita não passa por RLS (ver docs/BANCO.md).
 * Roda só na sua máquina, nunca em produção.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { pathToFileURL } from "node:url";

// ── Variáveis ────────────────────────────────────────────────────────────────
// Lê o .env.local sem depender de pacote extra.
for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY no .env.local.\n" +
      "A secret key está em Project Settings → API Keys. Ver docs/FASE-1.md §1.1.",
  );
  process.exit(1);
}

const db = createClient(url, chave, { auth: { persistSession: false } });

// ── Ler as peças ─────────────────────────────────────────────────────────────
//
// O arquivo é TypeScript e o Node não importa .ts direto. Em vez de fatiar o
// texto procurando colchete — o que quebrou antes, porque `MockWatch[]` tem um
// `[` no meio da declaração —, tiramos as anotações de tipo e importamos o
// módulo de verdade. Assim a extração não depende de formatação.

const fonte = readFileSync("src/lib/data/watches.ts", "utf8");

// Recorta só a declaração do MOCK_WATCHES. O que vem depois são funções
// auxiliares com assinatura tipada, que o Node não interpreta.
const inicio = fonte.indexOf("export const MOCK_WATCHES");
if (inicio === -1) {
  console.error("Não achei `export const MOCK_WATCHES` em src/lib/data/watches.ts.");
  process.exit(1);
}
const seguinte = fonte.indexOf("\nexport ", inicio + 1);
const trecho = fonte.slice(inicio, seguinte === -1 ? undefined : seguinte);

// Fora a anotação de tipo, o corpo já é JavaScript válido.
const js = trecho.replace(": readonly MockWatch[]", "");

const temp = "scripts/.watches.tmp.mjs";
writeFileSync(temp, js);

let pecas;
try {
  ({ MOCK_WATCHES: pecas } = await import(pathToFileURL(temp).href));
} finally {
  unlinkSync(temp);
}

if (!Array.isArray(pecas) || pecas.length === 0) {
  console.error(
    "Nenhuma peça encontrada em src/lib/data/watches.ts.\n" +
      "Se o arquivo mudou de formato, ajuste a extração acima.",
  );
  process.exit(1);
}

console.log(`${pecas.length} peças no arquivo de origem\n`);

// ── Inserir ──────────────────────────────────────────────────────────────────

let ok = 0;
for (const p of pecas) {
  const { data: peca, error } = await db
    .from("pecas")
    .upsert(
      {
        slug: p.slug,
        marca: p.brand,
        modelo: p.model,
        condicao: p.condition,
        integralidade: p.completeness,
        referencia: p.specs.reference ?? null,
        calibre: p.specs.caliber ?? null,
        diametro_mm: p.specs.caseDiameterMm ?? null,
        material_caixa: p.specs.caseMaterial ?? null,
        pulseira: p.specs.bracelet ?? null,
        mostrador: p.specs.dial ?? null,
        ano_cartao: p.specs.warrantyYear ?? null,
        preco_centavos: p.priceCents,
        // Escreve o enum, não o booleano: `disponivel` é coluna derivada e
        // some quando o trigger de compatibilidade for retirado.
        estado: p.available ? "disponivel" : "vendida",
        consignada: p.consigned ?? false,
        historia: p.story ?? null,
        notas_estado: p.conditionNotes ?? null,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) {
    console.error(`  ✗ ${p.slug}: ${error.message}`);
    continue;
  }

  // Fotos são substituídas por inteiro: mais simples e mais correto que
  // reconciliar, e a ordem sempre reflete o arquivo de origem.
  await db.from("fotos").delete().eq("peca_id", peca.id);

  const fotos = [
    p.images.primary,
    ...(p.images.secondary ? [p.images.secondary] : []),
    ...(p.images.gallery ?? []),
  ]
    .filter((f) => f.url !== "")
    .map((f, i) => ({ peca_id: peca.id, url: f.url, alt: f.alt, ordem: i }));

  if (fotos.length) await db.from("fotos").insert(fotos);

  console.log(`  ✓ ${p.slug} (${fotos.length} foto${fotos.length === 1 ? "" : "s"})`);
  ok++;
}

console.log(`\n${ok} de ${pecas.length} peças no banco.`);
if (ok < pecas.length) process.exit(1);
