"use server";

/**
 * Guardar uma peça.
 *
 * O gesto pequeno que faltava entre olhar e chamar no WhatsApp. Para o cliente
 * é a lista dele dentro do clube; para a casa é demanda por peça, medida antes
 * de qualquer conversa.
 *
 * A escrita passa pela **sessão do cliente**, não pela chave secret: o RLS da
 * fase 14 já diz que cada um só mexe na própria lista, e usar a sessão faz o
 * banco cobrar essa regra em vez de confiar neste arquivo.
 */

import { revalidatePath } from "next/cache";

import { clienteAtual, dbServidor } from "@/lib/db/server";

export interface EstadoGuardada {
  guardada?: boolean;
  erro?: string;
}

export async function alternarGuardada(
  pecaId: string,
): Promise<EstadoGuardada> {
  const cliente = await clienteAtual();
  if (!cliente || cliente.status !== "ativo") {
    return { erro: "Entre na sua conta para guardar peças." };
  }

  if (!pecaId) return { erro: "Peça inválida." };

  const db = await dbServidor();

  const { data: existente } = await db
    .from("guardadas")
    .select("peca_id")
    .eq("cliente_id", cliente.id)
    .eq("peca_id", pecaId)
    .maybeSingle();

  if (existente) {
    const { error } = await db
      .from("guardadas")
      .delete()
      .eq("cliente_id", cliente.id)
      .eq("peca_id", pecaId);

    if (error) {
      console.error("Falha ao soltar peça guardada", { message: error.message });
      return { erro: "Não foi possível tirar da sua lista agora." };
    }

    revalidatePath("/acervo");
    return { guardada: false };
  }

  const { error } = await db
    .from("guardadas")
    .insert({ cliente_id: cliente.id, peca_id: pecaId });

  if (error) {
    console.error("Falha ao guardar peça", { message: error.message });
    return { erro: "Não foi possível guardar agora. Tente de novo." };
  }

  revalidatePath("/acervo");
  return { guardada: true };
}

/** Os ids que este cliente guardou — para a tela abrir já com o estado certo. */
export async function pecasGuardadas(): Promise<string[]> {
  const cliente = await clienteAtual();
  if (!cliente || cliente.status !== "ativo") return [];

  const db = await dbServidor();
  const { data } = await db
    .from("guardadas")
    .select("peca_id")
    .eq("cliente_id", cliente.id);

  return (data ?? []).map((linha) => linha.peca_id as string);
}
