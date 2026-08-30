"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

export interface ConviteItem {
  id: string;
  token: string;
  nomeSugerido: string | null;
  criadoPor: string;
  expiraEm: string;
  usadoEm: string | null;
  clienteId: string | null;
  criadoEm: string;
  status: "ativo" | "usado" | "expirado";
}

export type EstadoConvite = {
  erro?: string;
  sucesso?: string;
  token?: string;
  url?: string;
  mensagemWhatsapp?: string;
};

export async function gerarNovoConvite(
  prevState: EstadoConvite | null,
  formData: FormData,
): Promise<EstadoConvite> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const nomeSugerido = String(formData.get("nome") ?? "").trim() || null;
  const token = crypto.randomBytes(16).toString("hex");

  const { data, error } = await dbAdmin
    .from("convites")
    .insert({
      token,
      nome_sugerido: nomeSugerido,
      // O e-mail do admin vem do Auth e é opcional no tipo; na prática sempre
      // existe, mas a coluna é `not null` e não aceita palpite.
      criado_por: admin.email ?? "admin",
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("token")
    .single();

  if (error || !data) {
    console.error("Falha ao gerar convite:", error);
    return { erro: "Não foi possível gerar o link de convite. Tente novamente." };
  }

  revalidatePath("/painel");

  const host = process.env.NEXT_PUBLIC_SITE_URL || "https://andre-watches.vercel.app";
  const url = `${host}/convite/${token}`;

  const saudacaoNome = nomeSugerido ? `Olá, ${nomeSugerido}. ` : "Olá. ";
  const mensagemWhatsapp = `${saudacaoNome}Aqui está seu convite exclusivo para acessar o acervo privado da Andre Watches:\n\n${url}\n\nO link é de uso único e pessoal, válido por 7 dias.`;

  return {
    sucesso: "Convite gerado com sucesso.",
    token,
    url,
    mensagemWhatsapp,
  };
}

export async function revogarConvite(id: string): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada." };

  const { error } = await dbAdmin.from("convites").delete().eq("id", id);
  if (error) {
    return { erro: "Falha ao remover convite." };
  }

  revalidatePath("/painel");
  return { sucesso: "Convite removido." };
}

export async function listarConvites(): Promise<ConviteItem[]> {
  const admin = await usuarioAdmin();
  if (!admin) return [];

  const { data, error } = await dbAdmin
    .from("convites")
    .select("id, token, nome_sugerido, criado_por, expira_em, usado_em, cliente_id, criado_em")
    .order("criado_em", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const agora = new Date();

  return data.map((item) => {
    const expirou = new Date(item.expira_em) < agora;
    const usado = Boolean(item.usado_em);
    let status: ConviteItem["status"] = "ativo";
    if (usado) status = "usado";
    else if (expirou) status = "expirado";

    return {
      id: item.id,
      token: item.token,
      nomeSugerido: item.nome_sugerido,
      criadoPor: item.criado_por,
      expiraEm: item.expira_em,
      usadoEm: item.usado_em,
      clienteId: item.cliente_id,
      criadoEm: item.criado_em,
      status,
    };
  });
}