/**
 * Aplica um arquivo .sql no banco, pela conexão direta.
 *
 *   node scripts/aplicar-sql.mjs supabase/fase-4.sql
 *
 * Usa `DIRECT_URL` (porta 5432, modo sessão) e não o pooler de transação: o
 * pooler não suporta comandos de esquema, que é exatamente o que migração faz.
 *
 * O arquivo é enviado inteiro, numa chamada só. Fatiar por `;` quebraria os
 * blocos `do $$ ... $$` e o corpo das funções, que têm ponto e vírgula dentro.
 */

import { readFileSync } from "node:fs";
import pg from "pg";

function carregarEnv() {
  for (const arquivo of [".env.local", ".env"]) {
    try {
      // `\r?\n`: o .env.local é escrito no Windows e vem com CRLF. Sem isto o
      // `\r` entra no fim do valor e o host da conexão fica inválido.
      for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
        const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
        }
      }
    } catch {
      // Arquivo ausente é normal — em produção as variáveis já vêm do ambiente.
    }
  }
}

const caminho = process.argv[2];
if (!caminho) {
  console.error("Uso: node scripts/aplicar-sql.mjs <arquivo.sql>");
  process.exit(1);
}

carregarEnv();

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("Falta DIRECT_URL no .env.local — ver docs/FASE-1.md §1.1.");
  process.exit(1);
}

const sql = readFileSync(caminho, "utf8");
const cliente = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await cliente.connect();
  await cliente.query(sql);
  console.log(`✓ ${caminho} aplicado.`);
} catch (erro) {
  console.error(`✗ Falha ao aplicar ${caminho}:`);
  console.error(`  ${erro.message}`);
  if (erro.position) console.error(`  posição ${erro.position}`);
  process.exitCode = 1;
} finally {
  await cliente.end();
}
