"use server";

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

const STATUS_VALIDOS = ["em_conversa", "negociando", "vendido", "perdido"] as const;
export type StatusInteresse = (typeof STATUS_VALIDOS)[number];

export async function mudarStatusInteresse(
  id: string,
  status: StatusInteresse,
): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada." };

  if (!STATUS_VALIDOS.includes(status)) {
    return { erro: "Status inválido." };
  }

  const { error } = await dbAdmin
    .from("interesses")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Falha ao mudar status de interesse:", error);
    return { erro: "Não foi possível atualizar o status." };
  }

  revalidatePath("/painel/negociacoes");
  return { sucesso: "Status atualizado." };
}

export async function salvarObservacaoInteresse(
  id: string,
  observacao: string,
): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada." };

  const { error } = await dbAdmin
    .from("interesses")
    .update({ observacao: observacao.trim() || null, atualizado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { erro: "Falha ao salvar observação." };
  }

  revalidatePath("/painel/negociacoes");
  return { sucesso: "Observação salva." };
}

export async function excluirInteresse(
  id: string,
): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada." };

  const { error } = await dbAdmin.from("interesses").delete().eq("id", id);
  if (error) {
    return { erro: "Falha ao remover negociação." };
  }

  revalidatePath("/painel/negociacoes");
  return { sucesso: "Removido do pipeline." };
}

export async function mudarStatusEncomenda(
  id: string,
  status: "em_busca" | "atendido" | "cancelado",
): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada." };

  const { error } = await dbAdmin
    .from("encomendas")
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { erro: "Falha ao atualizar encomenda." };
  }

  revalidatePath("/painel/negociacoes");
  return { sucesso: "Status da encomenda atualizado." };
}