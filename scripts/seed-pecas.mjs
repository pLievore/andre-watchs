/**
 * Semente do catálogo — leva as peças de src/lib/data/watches.ts para o banco.
 *
 *   node scripts/seed-pecas.mjs
 *
 * IDEMPOTENTE: usa `slug` como chave. Rodar de novo atualiza em vez de
 * duplicar, então dá pra corrigir o mock e semear outra vez sem limpar nada.
 *
 * Usa a chave service_role porque escrita não passa por RLS (ver docs/BANCO.md).
 * Roda só na sua máquina, nunca em produção.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Lê as variáveis do .env.local sem depender de pacote extra.
for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("Faltam variáveis do Supabase no .env.local — ver docs/FASE-1.md §1.1");
  process.exit(1);
}

const db = createClient(url, chave, { auth: { persistSession: false } });

// O mock é TypeScript; extraímos o array por avaliação do literal em vez de
// compilar o projeto só pra semear.
const fonte = readFileSync("src/lib/data/watches.ts", "utf8");
const inicio = fonte.indexOf("MOCK_WATCHES: readonly MockWatch[] = [");
const abre = fonte.indexOf("[", inicio);
let profundidade = 0, fim = abre;
for (let i = abre; i < fonte.length; i++) {
  if (fonte[i] === "[") profundidade++;
  else if (fonte[i] === "]" && --profundidade === 0) { fim = i + 1; break; }
}
const pecas = eval(fonte.slice(abre, fim));

console.log(`${pecas.length} peças no arquivo de origem\n`);

let inseridas = 0;
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
        disponivel: p.available,
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

  // Fotos são substituídas por inteiro: é mais simples e mais correto que
  // tentar reconciliar, e a ordem sempre reflete o arquivo de origem.
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
  inseridas++;
}

console.log(`\n${inseridas} de ${pecas.length} peças no banco.`);
