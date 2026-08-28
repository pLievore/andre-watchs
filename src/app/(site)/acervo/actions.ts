"use server";

import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";

/**
 * Registra a visita somente depois que a página já leu o timestamp anterior e
 * montou a saudação. Atualizar no login apagaria justamente o contexto que a
 * frase precisa (primeira visita, peças novas e tempo ausente).
 */
export async function registrarVisitaAoAcervo(): Promise<void> {
  const db = await dbServidor();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return;

  const { data: cliente } = await db
    .from("clientes")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (cliente?.status !== "ativo") return;

  const { error } = await dbAdmin
    .from("clientes")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Falha ao registrar visita ao acervo", {
      code: error.code,
      message: error.message,
    });
  }
}
