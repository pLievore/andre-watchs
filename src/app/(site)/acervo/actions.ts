"use server";

import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";
import { detectarOrigem } from "@/lib/geo";

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

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());

  if (isAdmin) return; // Não contabiliza visitas do administrador

  const { data: cliente } = await db
    .from("clientes")
    .select("status, telefone")
    .eq("id", user.id)
    .maybeSingle();

  if (cliente?.status !== "ativo") return;

  const { cidade, dispositivo } = await detectarOrigem(cliente?.telefone);

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

  // Registra o evento no funil identificado com geo e dispositivo
  await dbAdmin.from("eventos").insert({
    cliente_id: user.id,
    tipo: "acesso",
    cidade,
    dispositivo,
  });
}