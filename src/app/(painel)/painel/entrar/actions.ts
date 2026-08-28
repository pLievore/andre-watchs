"use server";

/**
 * A porta da casa — entrada do administrador.
 *
 * Separada de `(site)/acesso/actions.ts` de propósito, e não por duplicação
 * descuidada: são dois contratos diferentes.
 *
 * O login de cliente, ao dar certo, ainda precisa checar `clientes.status` e
 * pode recusar quem está pendente. O do admin não olha `clientes` nenhuma vez —
 * o dono não é cliente da própria casa. Manter os dois numa função só obrigaria
 * a um `if` no meio do caminho de autenticação, que é o pior lugar do sistema
 * para se ter um ramo a mais.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { dbServidor } from "@/lib/db/server";
import { destinoSeguroAposLogin } from "@/lib/rotas";

export type EstadoEntrada = { erro?: string };

export async function entrarNoPainel(
  _anterior: EstadoEntrada,
  form: FormData,
): Promise<EstadoEntrada> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const destinoPedido = String(form.get("destino") ?? "");

  if (!email || !senha) return { erro: "Preencha e-mail e senha." };

  /*
   * Uma mensagem só para todos os casos: senha errada, e-mail que não existe,
   * e e-mail válido que não é admin. Se a recusa por "não é admin" tivesse
   * texto próprio, esta tela viraria um oráculo para descobrir qual e-mail
   * administra o site — que é exatamente o alvo de quem tenta entrar aqui.
   */
  const recusa = { erro: "E-mail ou senha incorretos." };

  if (!isAdminEmail(email)) return recusa;

  const db = await dbServidor();
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error || !data.user) return recusa;

  // Cinto e suspensório: a sessão criada tem que ser mesmo a do admin. Sem
  // isto, uma divergência entre o e-mail digitado e o da conta autenticada
  // passaria batida.
  if (!isAdminEmail(data.user.email)) {
    await db.auth.signOut();
    return recusa;
  }

  revalidatePath("/", "layout");
  redirect(destinoSeguroAposLogin(destinoPedido, "/painel"));
}

/** Sair leva à própria porta do painel, não à home da vitrine. */
export async function sairDoPainel() {
  const db = await dbServidor();
  await db.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/painel/entrar");
}
