"use server";

/**
 * Ações da conta: atualizar dados pessoais e trocar senha.
 *
 * As duas exigem cliente autenticado E ativo — a mesma checagem dupla usada em
 * `acervo/actions.ts`, porque uma sessão válida sozinha não basta (Fase 2).
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";

export type EstadoConta = { erro?: string; sucesso?: string };

async function usuarioAtivo() {
  const db = await dbServidor();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: cliente } = await db
    .from("clientes")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  return cliente?.status === "ativo" ? user : null;
}

/**
 * Atualiza nome e telefone. Só esses dois campos saem do formulário e chegam
 * ao banco — `status` e `email` nunca passam por aqui, então não existe
 * caminho para o cliente se promover sozinho ou trocar a identidade que o
 * Auth usa para o login.
 */
export async function atualizarDados(
  _anterior: EstadoConta,
  form: FormData,
): Promise<EstadoConta> {
  const user = await usuarioAtivo();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const nome = String(form.get("nome") ?? "").trim();
  const telefone = String(form.get("telefone") ?? "").trim();

  if (nome.length < 2 || nome.length > 120) {
    return { erro: "Informe um nome válido." };
  }
  if (telefone.replace(/\D/g, "").length < 10) {
    return { erro: "Informe um telefone válido, com DDD." };
  }

  const { error } = await dbAdmin
    .from("clientes")
    .update({ nome, telefone })
    .eq("id", user.id);

  if (error) {
    console.error("Falha ao atualizar dados do cliente", {
      code: error.code,
      message: error.message,
    });
    return {
      erro: "Não foi possível salvar agora. Tente de novo em instantes.",
    };
  }

  // A saudação e o header leem o nome — sem isso, ficariam com o valor velho
  // até a sessão renovar sozinha.
  revalidatePath("/", "layout");
  return { sucesso: "Dados atualizados." };
}

/**
 * Troca a senha. Não pede a senha atual: a própria sessão já prova quem é —
 * é o mesmo raciocínio que o Supabase Auth usa em qualquer troca autenticada.
 */
export async function trocarSenha(
  _anterior: EstadoConta,
  form: FormData,
): Promise<EstadoConta> {
  const user = await usuarioAtivo();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };

  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "");

  if (senha.length < 6) {
    return { erro: "A nova senha precisa ter ao menos 6 caracteres." };
  }
  if (senha !== confirmacao) {
    return { erro: "As senhas não coincidem." };
  }

  const db = await dbServidor();
  const { error } = await db.auth.updateUser({ password: senha });

  if (error) {
    console.error("Falha ao trocar senha", { message: error.message });
    return { erro: "Não foi possível trocar a senha agora. Tente de novo." };
  }

  return { sucesso: "Senha alterada." };
}
