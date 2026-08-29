"use server";

import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";
import { detectarOrigem } from "@/lib/geo";

export async function registrarVisualizacaoPeca(pecaId: string): Promise<void> {
  if (!pecaId) return;

  const db = await dbServidor();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());

  if (isAdmin) return; // Não contabiliza navegação do administrador

  const { data: cliente } = await dbAdmin
    .from("clientes")
    .select("status, telefone")
    .eq("id", user.id)
    .maybeSingle();

  if (cliente?.status !== "ativo") return;

  const { cidade, dispositivo } = await detectarOrigem(cliente?.telefone);

  const { error } = await dbAdmin.from("eventos").insert({
    cliente_id: user.id,
    tipo: "viu_peca",
    peca_id: pecaId,
    cidade,
    dispositivo,
  });

  if (error) {
    console.error("Falha ao registrar visualização de peça:", error);
  }
}

export async function registrarCliqueWhatsapp(pecaId?: string): Promise<void> {
  const db = await dbServidor();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return;

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());

  if (isAdmin) return; // Não contabiliza cliques do administrador

  const { data: cliente } = await dbAdmin
    .from("clientes")
    .select("status, telefone")
    .eq("id", user.id)
    .maybeSingle();

  if (cliente?.status !== "ativo") return;

  const { cidade, dispositivo } = await detectarOrigem(cliente?.telefone);

  // 1. Registra o evento de conversão com geo e dispositivo
  await dbAdmin.from("eventos").insert({
    cliente_id: user.id,
    tipo: "foi_whatsapp",
    peca_id: pecaId || null,
    cidade,
    dispositivo,
  });

  // 2. Se for uma peça específica, abre ou atualiza a negociação no pipeline
  if (pecaId) {
    const { error: erroInteresse } = await dbAdmin
      .from("interesses")
      .upsert(
        {
          cliente_id: user.id,
          peca_id: pecaId,
          status: "em_conversa",
        },
        { onConflict: "cliente_id,peca_id" },
      );

    if (erroInteresse) {
      console.error("Falha ao registrar interesse:", erroInteresse);
    }
  }
}