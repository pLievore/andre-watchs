import "server-only";

/**
 * ⚠️ CLIENTE ADMINISTRATIVO — chave `secret`, **IGNORA RLS**.
 *
 * Esta chave enxerga e altera tudo. Se ela chegar ao navegador, o banco inteiro
 * fica exposto para quem abrir o inspetor.
 *
 * A primeira linha do arquivo (`import "server-only"`) é a proteção: qualquer
 * módulo com `"use client"` que importe isto **quebra o build**, em vez de
 * vazar em silêncio. Não remova.
 *
 * Use só onde for inevitável — escrita pelo painel e scripts de semente.
 * Leitura normal é com o `db` de `client.ts`.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./tipos-banco";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SECRET_KEY. " +
      "Ver docs/FASE-1.md §1.1.",
  );
}

export const dbAdmin = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
