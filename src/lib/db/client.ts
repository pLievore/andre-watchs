/**
 * Cliente de banco padrão — chave `publishable`, **respeita RLS**.
 *
 * É este que se usa em 99% dos casos. Ele só enxerga o que as políticas do
 * banco permitem, então um erro de lógica na aplicação não vira vazamento.
 *
 * Para escrita (painel, semente) veja `admin.ts` — e leia o aviso de lá.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./tipos-banco";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !anonKey) {
  // Falha alto e cedo. Sem isto, a ausência da variável vira um erro obscuro
  // de rede no meio de uma consulta, muito mais difícil de diagnosticar.
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
      "Copie .env.example para .env.local e preencha — ver docs/FASE-1.md §1.1.",
  );
}

export const db = createClient<Database>(url, anonKey, {
  auth: {
    // Fase 1 não tem login. Persistir sessão aqui só criaria estado inútil;
    // a Fase 2 troca isto quando a autenticação entrar.
    persistSession: false,
  },
});
