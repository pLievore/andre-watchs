"use server";

/**
 * A conta do administrador.
 *
 * Não reaproveita `(site)/acervo/conta/actions.ts` porque aquele arquivo exige
 * `clientes.status = 'ativo'` antes de qualquer coisa — e o dono da casa não
 * tem linha em `clientes`. Rodar aquela checagem aqui recusaria o admin na
 * própria conta dele.
 *
 * Só troca de senha: nome e telefone são dados de cliente. A identidade do
 * admin é o e-mail, e ele vive em `ADMIN_EMAILS`, não no banco — mudá-lo pela
 * interface tiraria o próprio acesso de quem mudou.
 */

import { usuarioAdmin } from "@/lib/db/admin-auth";
import { dbServidor } from "@/lib/db/server";

export type EstadoConta = { erro?: string; sucesso?: string };

export async function trocarSenhaAdmin(
  _anterior: EstadoConta,
  form: FormData,
): Promise<EstadoConta> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre de novo." };

  const senha = String(form.get("senha") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "");

  // Piso mais alto que o do cliente (6): esta senha abre o acervo inteiro, os
  // dados de todos os clientes e a exclusão de peças. O risco não é o mesmo.
  if (senha.length < 10) {
    return { erro: "A senha do painel precisa ter ao menos 10 caracteres." };
  }
  if (senha !== confirmacao) {
    return { erro: "As senhas não coincidem." };
  }

  const db = await dbServidor();
  const { error } = await db.auth.updateUser({ password: senha });

  if (error) {
    console.error("Falha ao trocar senha do admin", { message: error.message });
    return { erro: "Não foi possível trocar a senha agora. Tente de novo." };
  }

  return { sucesso: "Senha alterada." };
}
