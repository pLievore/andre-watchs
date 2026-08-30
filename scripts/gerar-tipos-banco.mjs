/**
 * Gera `src/lib/db/tipos-banco.ts` a partir do banco de verdade.
 *
 *   node scripts/gerar-tipos-banco.mjs
 *
 * Por que existe: o cliente Supabase é criado sem tipos, então toda linha
 * chega como `any` — e o `any` foi vazando para as telas do painel. O CLI
 * oficial (`supabase gen types`) resolveria, mas exige a ferramenta instalada
 * e login; aqui o esquema é lido pela mesma `DIRECT_URL` que aplica as
 * migrações, sem dependência nova.
 *
 * Rodar de novo depois de cada migração. O arquivo gerado é versionado: quem
 * revisa um PR precisa ver a forma do banco mudar junto com o código.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");

for (const arquivo of [".env.local", ".env"]) {
  try {
    for (const linha of readFileSync(join(raiz, arquivo), "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Ausente em produção, onde as variáveis já vêm do ambiente.
  }
}

if (!process.env.DIRECT_URL) {
  console.error("Falta DIRECT_URL no .env.local.");
  process.exit(1);
}

const cliente = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

/** Postgres → TypeScript. O que não estiver aqui vira `string`, que é o mais seguro. */
function paraTs(tipo, enums) {
  if (enums.has(tipo)) return enums.get(tipo);
  switch (tipo) {
    case "uuid":
    case "text":
    case "character varying":
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "date":
      return "string";
    case "smallint":
    case "integer":
    case "bigint":
    case "numeric":
    case "real":
    case "double precision":
      return "number";
    case "boolean":
      return "boolean";
    case "jsonb":
    case "json":
      return "Json";
    case "ARRAY":
      return "string[]";
    default:
      return "string";
  }
}

await cliente.connect();

const { rows: tiposEnum } = await cliente.query(`
  select t.typname as nome, array_agg(e.enumlabel::text order by e.enumsortorder) as valores
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in ('public')
  group by t.typname
  order by t.typname
`);

const enums = new Map(
  tiposEnum.map((linha) => [
    linha.nome,
    linha.valores.map((v) => `"${v}"`).join(" | "),
  ]),
);

const { rows: colunas } = await cliente.query(`
  select
    c.table_name,
    c.column_name,
    c.is_nullable,
    c.column_default,
    case when c.data_type = 'USER-DEFINED' then c.udt_name else c.data_type end as tipo,
    c.is_identity
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
  order by c.table_name, c.ordinal_position
`);

const { rows: relacoes } = await cliente.query(`
  select
    con.conname as nome,
    origem.relname as tabela,
    (select array_agg(att.attname::text order by u.ord)
       from unnest(con.conkey) with ordinality as u(attnum, ord)
       join pg_attribute att on att.attrelid = origem.oid and att.attnum = u.attnum
    ) as colunas,
    destino.relname as tabela_referida,
    (select array_agg(att.attname::text order by u.ord)
       from unnest(con.confkey) with ordinality as u(attnum, ord)
       join pg_attribute att on att.attrelid = destino.oid and att.attnum = u.attnum
    ) as colunas_referidas
  from pg_constraint con
  join pg_class origem on origem.oid = con.conrelid
  join pg_class destino on destino.oid = con.confrelid
  join pg_namespace n on n.oid = origem.relnamespace
  where con.contype = 'f' and n.nspname = 'public'
  order by origem.relname, con.conname
`);

const { rows: funcoes } = await cliente.query(`
  select p.proname as nome
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  order by p.proname
`);

await cliente.end();

const tabelas = new Map();
for (const coluna of colunas) {
  if (!tabelas.has(coluna.table_name)) tabelas.set(coluna.table_name, []);
  tabelas.get(coluna.table_name).push(coluna);
}

const linhas = [];
linhas.push("/**");
linhas.push(" * Forma do banco, em TypeScript.");
linhas.push(" *");
linhas.push(" * ⚠️ ARQUIVO GERADO — não edite à mão.");
linhas.push(" * Rode `node scripts/gerar-tipos-banco.mjs` depois de cada migração.");
linhas.push(" *");
linhas.push(" * É o que tira o `any` das telas: com ele o cliente Supabase sabe o nome e o");
linhas.push(" * tipo de cada coluna, e um `select` com coluna inexistente para de compilar.");
linhas.push(" */");
linhas.push("");
linhas.push("export type Json =");
linhas.push("  | string");
linhas.push("  | number");
linhas.push("  | boolean");
linhas.push("  | null");
linhas.push("  | { [chave: string]: Json | undefined }");
linhas.push("  | Json[];");
linhas.push("");
linhas.push("export interface Database {");
linhas.push("  public: {");
linhas.push("    Tables: {");

for (const [tabela, cols] of [...tabelas].sort()) {
  const relacoesDaTabela = relacoes.filter((r) => r.tabela === tabela);

  linhas.push(`      ${tabela}: {`);

  linhas.push("        Row: {");
  for (const c of cols) {
    const tipo = paraTs(c.tipo, enums);
    const nulo = c.is_nullable === "YES" ? " | null" : "";
    linhas.push(`          ${c.column_name}: ${tipo}${nulo};`);
  }
  linhas.push("        };");

  linhas.push("        Insert: {");
  for (const c of cols) {
    const tipo = paraTs(c.tipo, enums);
    const nulo = c.is_nullable === "YES" ? " | null" : "";
    // Coluna com default ou anulável pode faltar no insert.
    // Coluna com default, anulável ou de identidade pode faltar no insert —
    // identidade não expõe `column_default`, e sem esta checagem o tipo
    // gerado exigiria um `id` que o banco preenche sozinho.
    const opcional =
      c.column_default !== null ||
      c.is_nullable === "YES" ||
      c.is_identity === "YES"
        ? "?"
        : "";
    linhas.push(`          ${c.column_name}${opcional}: ${tipo}${nulo};`);
  }
  linhas.push("        };");

  linhas.push("        Update: {");
  for (const c of cols) {
    const tipo = paraTs(c.tipo, enums);
    const nulo = c.is_nullable === "YES" ? " | null" : "";
    linhas.push(`          ${c.column_name}?: ${tipo}${nulo};`);
  }
  linhas.push("        };");

  linhas.push("        Relationships: [");
  for (const r of relacoesDaTabela) {
    linhas.push("          {");
    linhas.push(`            foreignKeyName: "${r.nome}";`);
    linhas.push(`            columns: [${r.colunas.map((c) => `"${c}"`).join(", ")}];`);
    linhas.push("            isOneToOne: false;");
    linhas.push(`            referencedRelation: "${r.tabela_referida}";`);
    linhas.push(
      `            referencedColumns: [${r.colunas_referidas.map((c) => `"${c}"`).join(", ")}];`,
    );
    linhas.push("          },");
  }
  linhas.push("        ];");

  linhas.push("      };");
}

linhas.push("    };");
linhas.push("    Views: { [_ in never]: never };");

linhas.push("    Functions: {");
for (const f of funcoes) {
  linhas.push(`      ${f.nome}: {`);
  linhas.push("        Args: Record<string, unknown>;");
  linhas.push("        Returns: unknown;");
  linhas.push("      };");
}
linhas.push("    };");

linhas.push("    Enums: {");
for (const [nome, valores] of enums) {
  linhas.push(`      ${nome}: ${valores};`);
}
linhas.push("    };");
linhas.push("    CompositeTypes: { [_ in never]: never };");
linhas.push("  };");
linhas.push("}");
linhas.push("");

const destino = join(raiz, "src/lib/db/tipos-banco.ts");
writeFileSync(destino, linhas.join("\n"), "utf8");
console.log(
  `✓ src/lib/db/tipos-banco.ts — ${tabelas.size} tabelas, ${enums.size} enums, ${relacoes.length} relações.`,
);
