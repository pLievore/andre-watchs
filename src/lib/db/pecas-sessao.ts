import "server-only";

/**
 * Leitura de peças **com a sessão do cliente**.
 *
 * As funções de `pecas.ts` usam o cliente anônimo, que desde a Fase 2 não
 * enxerga mais nada: o RLS só libera o acervo para cliente ativo. Estas aqui
 * carregam o cookie de sessão, então o banco sabe quem está pedindo.
 *
 * O mapeamento para o tipo `Watch` é o mesmo — importado dali para não existir
 * em dois lugares e divergir com o tempo.
 */

import { dbServidor } from "@/lib/db/server";
import { CAMPOS, paraWatch, type LinhaPeca } from "@/lib/db/pecas";
import type { Watch } from "@/lib/types";

export async function listarPecasDoCliente(): Promise<Watch[]> {
  const db = await dbServidor();
  const { data, error } = await db
    .from("pecas")
    .select(CAMPOS)
    .order("disponivel", { ascending: false })
    .order("criado_em", { ascending: false });

  if (error) throw new Error(`Falha ao listar peças: ${error.message}`);
  return (data as unknown as LinhaPeca[]).map(paraWatch);
}

export async function buscarPecaDoCliente(
  slug: string,
): Promise<Watch | undefined> {
  const db = await dbServidor();
  const { data, error } = await db
    .from("pecas")
    .select(CAMPOS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar peça ${slug}: ${error.message}`);
  return data ? paraWatch(data as unknown as LinhaPeca) : undefined;
}

/**
 * Quantas peças entraram desde uma data. Alimenta a saudação — é a informação
 * que traz o cliente de volta.
 */
export async function contarPecasDesde(desde: string | null): Promise<number> {
  if (!desde) return 0;
  const db = await dbServidor();
  const { count, error } = await db
    .from("pecas")
    .select("id", { count: "exact", head: true })
    .gt("criado_em", desde);
  if (error) throw new Error(`Falha ao contar peças novas: ${error.message}`);
  return count ?? 0;
}
