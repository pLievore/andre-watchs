/**
 * Cria um cliente com acesso liberado, pela linha de comando.
 *
 *   node scripts/criar-cliente.mjs "Nome Completo" email@exemplo.com 11999999999
 *
 * Existe porque o painel que cadastra clientes só chega na Fase 3, e sem isto
 * não haveria como entrar no site para testar. Quando o painel existir, este
 * script continua útil para criar o primeiro acesso num ambiente novo.
 *
 * A senha inicial é o telefone (SPEC D24), com apenas os dígitos.
 *
 * Idempotente: rodar de novo com o mesmo e-mail atualiza em vez de duplicar.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const linha of readFileSync(".env.local", "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY;
if (!url || !chave) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY no .env.local.");
  process.exit(1);
}

const [nome, email, telefone] = process.argv.slice(2);
if (!nome || !email || !telefone) {
  console.error(
    'Uso: node scripts/criar-cliente.mjs "Nome Completo" email@exemplo.com 11999999999',
  );
  process.exit(1);
}

const senha = telefone.replace(/\D/g, "");
if (senha.length < 6) {
  console.error("O telefone precisa ter ao menos 6 dígitos — é ele que vira a senha.");
  process.exit(1);
}

const db = createClient(url, chave, { auth: { persistSession: false } });

// 1. Identidade no Auth. `email_confirm` evita o passo de confirmar e-mail:
//    quem cadastra é a casa, não o próprio cliente.
let userId;
const { data: criado, error: erroCriar } = await db.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome },
});

if (erroCriar) {
  // Já existe: encontra e atualiza a senha, para o script ser idempotente.
  const { data: lista } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existente = lista?.users.find((u) => u.email === email);
  if (!existente) {
    console.error(`Falha ao criar usuário: ${erroCriar.message}`);
    process.exit(1);
  }
  userId = existente.id;
  await db.auth.admin.updateUserById(userId, { password: senha });
  console.log("Usuário já existia — senha atualizada.");
} else {
  userId = criado.user.id;
}

// 2. Registro de negócio, já ativo.
const { error: erroCliente } = await db.from("clientes").upsert(
  { id: userId, nome, email, telefone, status: "ativo" },
  { onConflict: "id" },
);

if (erroCliente) {
  console.error(`Falha ao gravar cliente: ${erroCliente.message}`);
  process.exit(1);
}

console.log(`\n✓ ${nome} — acesso liberado`);
console.log(`  e-mail: ${email}`);
console.log(`  senha:  ${senha}  (o telefone, só dígitos)`);
