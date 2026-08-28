"use server";

/**
 * Ações da porta: entrar, sair, pedir acesso.
 *
 * Tudo aqui roda no servidor. A senha nunca passa por estado de componente e
 * nunca chega a JavaScript de cliente.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";
import { destinoSeguroAposLogin } from "@/lib/rotas";

export type EstadoForm = { erro?: string; sucesso?: string };

/**
 * Entrar.
 *
 * A mensagem de erro é a MESMA para e-mail inexistente e senha errada. Se
 * fossem diferentes, qualquer um poderia testar e-mails até descobrir quem é
 * cliente da casa — num acervo privado, a lista de clientes também é
 * informação sigilosa.
 */
export async function entrar(
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const destinoPedido = String(form.get("destino") ?? "");

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  /*
   * A administração tem porta própria (`/painel/entrar`) e não entra por aqui.
   * A recusa acontece ANTES de tentar autenticar: se a senha fosse conferida
   * primeiro, esta tela responderia diferente para o e-mail do admin com senha
   * certa e com senha errada — e viraria um oráculo para descobrir qual conta
   * administra o site.
   */
  if (isAdminEmail(email)) {
    return { erro: "E-mail ou senha incorretos." };
  }

  const db = await dbServidor();
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error || !data.user) {
    return { erro: "E-mail ou senha incorretos." };
  }

  // Autenticado não basta: quem está pendente ou recusado não entra.
  const { data: cliente } = await db
    .from("clientes")
    .select("status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (cliente?.status !== "ativo") {
    await db.auth.signOut();
    return {
      erro:
        cliente?.status === "pendente"
          ? "Seu pedido de acesso ainda está em análise."
          : "Este acesso não está ativo. Fale com a casa.",
    };
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguroAposLogin(destinoPedido, "/acervo"));
}

export async function sair() {
  const db = await dbServidor();
  await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Pedir acesso.
 *
 * Entra na fila sem criar identidade no Auth. A conta só nasce quando a casa
 * aprovar o pedido; criar antes permitiria que alguém ocupasse o e-mail de um
 * futuro cliente. A resposta é a mesma para pedido novo e repetido, para não
 * revelar quem já está na base.
 */
export async function pedirAcesso(
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const observacao = String(form.get("observacao") ?? "").trim();
  const empresa = String(form.get("empresa") ?? "").trim();

  const confirmacao =
    "Pedido registrado. A casa avalia e entra em contato pelo WhatsApp.";

  // Honeypot: humanos não veem nem alcançam este campo. Bots básicos costumam
  // preencher todos; a resposta continua genérica para não ensinar o filtro.
  if (empresa) return { sucesso: confirmacao };

  if (!nome || !email || !telefone) {
    return { erro: "Preencha nome, e-mail e telefone." };
  }

  if (nome.length > 120 || email.length > 254 || telefone.length > 30) {
    return { erro: "Revise os dados informados e tente novamente." };
  }

  if (observacao.length > 500) {
    return { erro: "O contexto pode ter no máximo 500 caracteres." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { erro: "Informe um e-mail válido." };
  }

  const senha = telefone.replace(/\D/g, "");
  if (senha.length < 10 || senha.length > 13) {
    return { erro: "Informe um telefone válido, com DDD." };
  }

  const { error } = await dbAdmin.from("solicitacoes_acesso").upsert(
    {
    nome,
    email,
    telefone,
    observacao: observacao || null,
      criado_em: new Date().toISOString(),
      resolvido_em: null,
    },
    { onConflict: "email" },
  );

  if (error) {
    // Sem PII no log. A tela oferece o contato direto como saída.
    console.error("Falha ao registrar pedido de acesso", {
      code: error.code,
      message: error.message,
    });
    return {
      erro: "Não foi possível registrar agora. Fale com a casa pelo canal abaixo.",
    };
  }

  return { sucesso: confirmacao };
}
