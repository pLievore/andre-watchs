"use server";

/**
 * Gestão de acesso dos clientes.
 *
 * Ativar e desativar é o controle do clube: desativar tira a pessoa do acervo
 * na hora, sem apagar histórico. Não existe "excluir cliente" de propósito —
 * quem já negociou faz parte do registro da casa, e apagar perderia o vínculo
 * com os interesses dele.
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

async function mudarStatus(form: FormData, status: "ativo" | "inativo") {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = String(form.get("id") ?? "").trim();
  if (!id) return;

  const { error } = await dbAdmin
    .from("clientes")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Falha ao mudar status de cliente", {
      code: error.code,
      message: error.message,
    });
    return;
  }

  revalidatePath("/painel/clientes");
}

export async function ativarCliente(form: FormData): Promise<void> {
  await mudarStatus(form, "ativo");
}

export async function desativarCliente(form: FormData): Promise<void> {
  await mudarStatus(form, "inativo");
}
