"use server";

/**
 * Aprovar ou recusar um pedido de acesso.
 *
 * Aprovar cria a identidade no Auth só agora (mesma lógica de
 * `scripts/criar-cliente.mjs`: senha inicial é o telefone) e apaga a linha da
 * fila — virou cliente, não precisa mais existir como pedido. Recusar mantém
 * a linha: "a lista de recusados também é informação" (PLANO-CLUBE §7).
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

export async function aprovarSolicitacao(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = Number(form.get("id"));
  if (!Number.isFinite(id)) return;

  const { data: solicitacao } = await dbAdmin
    .from("solicitacoes_acesso")
    .select("nome, email, telefone")
    .eq("id", id)
    .maybeSingle();
  if (!solicitacao) return;

  const senha = solicitacao.telefone.replace(/\D/g, "");

  let userId: string;
  const { data: criado, error: erroCriar } = await dbAdmin.auth.admin.createUser({
    email: solicitacao.email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: solicitacao.nome },
  });

  if (erroCriar) {
    // Já existe conta com esse e-mail: reaproveita em vez de falhar.
    const { data: lista } = await dbAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existente = lista?.users.find((u) => u.email === solicitacao.email);
    if (!existente) {
      console.error("Falha ao aprovar solicitação de acesso", {
        code: erroCriar.code,
        message: erroCriar.message,
      });
      return;
    }
    userId = existente.id;
    await dbAdmin.auth.admin.updateUserById(userId, { password: senha });
  } else {
    userId = criado.user.id;
  }

  const { error: erroCliente } = await dbAdmin.from("clientes").upsert(
    {
      id: userId,
      nome: solicitacao.nome,
      email: solicitacao.email,
      telefone: solicitacao.telefone,
      status: "ativo",
    },
    { onConflict: "id" },
  );
  if (erroCliente) {
    console.error("Falha ao ativar cliente aprovado", {
      code: erroCliente.code,
      message: erroCliente.message,
    });
    return;
  }

  await dbAdmin.from("solicitacoes_acesso").delete().eq("id", id);

  revalidatePath("/painel");
  revalidatePath("/painel/clientes");
}

export async function recusarSolicitacao(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = Number(form.get("id"));
  if (!Number.isFinite(id)) return;

  await dbAdmin
    .from("solicitacoes_acesso")
    .update({ resolvido_em: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/painel");
}
