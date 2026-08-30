"use server";

/**
 * Gestão de clientes — o cadastro inteiro, não só o interruptor de acesso.
 *
 * **A identidade vive em dois lugares.** `auth.users` guarda e-mail e senha (é
 * o que o login usa); `clientes` guarda nome, telefone, status e observação.
 * Toda operação que toca e-mail precisa escrever nos dois — se escrever só na
 * tabela, o cliente continua entrando com o e-mail antigo e o painel passa a
 * exibir um dado que não é o de acesso. Esse descompasso é silencioso e só
 * aparece quando alguém não consegue entrar.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { isAdminEmail } from "@/lib/admin";

export type EstadoCliente = { erro?: string; sucesso?: string };

const STATUS_VALIDOS = ["ativo", "pendente", "recusado", "inativo"] as const;
export type StatusCliente = (typeof STATUS_VALIDOS)[number];

function statusValido(v: FormDataEntryValue | null): StatusCliente | null {
  const s = String(v ?? "");
  return (STATUS_VALIDOS as readonly string[]).includes(s)
    ? (s as StatusCliente)
    : null;
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function revalidar(id?: string) {
  revalidatePath("/painel");
  revalidatePath("/painel/clientes");
  if (id) revalidatePath(`/painel/clientes/${id}`);
  // A saudação e o header leem o nome do cliente.
  revalidatePath("/", "layout");
}

// ─────────────────────────────────────────────────────────────────────────────
// Cadastro direto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria um cliente sem passar pela fila de pedidos.
 *
 * É o caminho mais usado na prática: o Andre conhece a pessoa pessoalmente, ou
 * pelo WhatsApp, e não faz sentido mandá-la preencher um formulário público
 * para depois aprovar a si mesmo. Até aqui isso só existia como script de
 * linha de comando (`scripts/criar-cliente.mjs`), o que na prática significava
 * que ele dependia do desenvolvedor.
 *
 * Senha inicial é o telefone só com dígitos (SPEC D24).
 */
export async function criarCliente(
  _anterior: EstadoCliente,
  form: FormData,
): Promise<EstadoCliente> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefone = String(form.get("telefone") ?? "").trim();
  const observacao = String(form.get("observacao") ?? "").trim();
  const status = statusValido(form.get("status")) ?? "ativo";

  if (nome.length < 2 || nome.length > 120) {
    return { erro: "Informe o nome completo." };
  }
  if (!emailValido(email)) return { erro: "Informe um e-mail válido." };

  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length < 10 || digitos.length > 13) {
    return { erro: "Informe um telefone válido, com DDD." };
  }

  // Um e-mail de admin virando cliente criaria uma conta com dois papéis e
  // regras de acesso conflitantes. Melhor recusar do que descobrir depois.
  if (isAdminEmail(email)) {
    return { erro: "Este e-mail administra o painel e não pode ser cliente." };
  }

  const { data: criado, error: erroAuth } = await dbAdmin.auth.admin.createUser({
    email,
    password: digitos,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (erroAuth || !criado?.user) {
    // A causa quase sempre é e-mail já cadastrado; dizer isso é útil aqui,
    // porque quem está lendo é o dono e não um visitante anônimo.
    console.error("Falha ao criar cliente", { message: erroAuth?.message });
    return {
      erro: "Não foi possível criar. Verifique se o e-mail já está cadastrado.",
    };
  }

  const { error: erroLinha } = await dbAdmin.from("clientes").insert({
    id: criado.user.id,
    nome,
    email,
    telefone,
    status,
    observacao: observacao || null,
  });

  if (erroLinha) {
    // Sem a linha em `clientes` a conta é órfã: existe no Auth, entra no
    // login e não passa em nenhuma checagem de status. Desfaz.
    await dbAdmin.auth.admin.deleteUser(criado.user.id);
    console.error("Falha ao registrar cliente", { message: erroLinha.message });
    return { erro: "Não foi possível criar. Tente de novo." };
  }

  revalidar();
  redirect(`/painel/clientes/${criado.user.id}?novo=1`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Edição
// ─────────────────────────────────────────────────────────────────────────────

/** Nome, telefone e observação. O e-mail tem caminho próprio — ver abaixo. */
export async function salvarCliente(
  _anterior: EstadoCliente,
  form: FormData,
): Promise<EstadoCliente> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id") ?? "").trim();
  if (!id) return { erro: "Cliente não identificado." };

  const nome = String(form.get("nome") ?? "").trim();
  const telefone = String(form.get("telefone") ?? "").trim();
  const observacao = String(form.get("observacao") ?? "").trim();

  if (nome.length < 2 || nome.length > 120) {
    return { erro: "Informe o nome completo." };
  }
  if (telefone.replace(/\D/g, "").length < 10) {
    return { erro: "Informe um telefone válido, com DDD." };
  }
  if (observacao.length > 500) {
    return { erro: "A observação pode ter no máximo 500 caracteres." };
  }

  const { error } = await dbAdmin
    .from("clientes")
    .update({ nome, telefone, observacao: observacao || null })
    .eq("id", id);

  if (error) {
    console.error("Falha ao salvar cliente", { message: error.message });
    return { erro: "Não foi possível salvar. Tente de novo." };
  }

  // O nome do Auth também é usado em e-mails do Supabase; mantê-lo alinhado
  // evita que a pessoa receba mensagem com o nome antigo.
  await dbAdmin.auth.admin.updateUserById(id, { user_metadata: { nome } });

  revalidar(id);
  return { sucesso: "Cliente atualizado." };
}

/**
 * Troca o e-mail — que é a credencial de login, não um dado de contato.
 *
 * Separado do resto do formulário de propósito: é a única alteração que muda
 * como a pessoa entra no site, e misturá-la com "corrigir o telefone" faria
 * alguém trocá-la sem perceber a consequência.
 */
export async function trocarEmailCliente(
  _anterior: EstadoCliente,
  form: FormData,
): Promise<EstadoCliente> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!id) return { erro: "Cliente não identificado." };
  if (!emailValido(email)) return { erro: "Informe um e-mail válido." };

  if (isAdminEmail(email)) {
    return { erro: "Este e-mail administra o painel e não pode ser cliente." };
  }

  // Auth primeiro: se falhar (e-mail em uso), a tabela não chega a divergir.
  const { error: erroAuth } = await dbAdmin.auth.admin.updateUserById(id, {
    email,
    email_confirm: true,
  });

  if (erroAuth) {
    console.error("Falha ao trocar e-mail", { message: erroAuth.message });
    return { erro: "Não foi possível trocar. O e-mail já pode estar em uso." };
  }

  const { error } = await dbAdmin
    .from("clientes")
    .update({ email })
    .eq("id", id);

  if (error) {
    console.error("Falha ao gravar e-mail do cliente", {
      message: error.message,
    });
    return {
      erro: "O login foi trocado, mas o cadastro não. Tente salvar de novo.",
    };
  }

  revalidar(id);
  return { sucesso: "E-mail de acesso trocado." };
}

/**
 * Define uma nova senha para o cliente.
 *
 * O Andre precisa disto porque o suporte dele é o WhatsApp: alguém liga
 * dizendo que não entra, e a resposta tem que ser resolver na hora. Sem isto,
 * a única saída era o desenvolvedor rodar um script.
 */
export async function redefinirSenhaCliente(
  _anterior: EstadoCliente,
  form: FormData,
): Promise<EstadoCliente> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const id = String(form.get("id") ?? "").trim();
  if (!id) return { erro: "Cliente não identificado." };

  const { data: cliente } = await dbAdmin
    .from("clientes")
    .select("telefone")
    .eq("id", id)
    .maybeSingle();
  if (!cliente) return { erro: "Cliente não encontrado." };

  const usarTelefone = form.get("modo") === "telefone";

  // Cliente sem telefone cadastrado não tem "senha do telefone" — antes isto
  // estourava em tempo de execução e devolvia erro 500 na cara do dono.
  if (usarTelefone && !cliente.telefone) {
    return {
      erro: "Este cliente não tem telefone cadastrado. Defina uma senha manual.",
    };
  }

  const senha = usarTelefone
    ? (cliente.telefone ?? "").replace(/\D/g, "")
    : String(form.get("senha") ?? "");

  if (senha.length < 6) {
    return { erro: "A senha precisa ter ao menos 6 caracteres." };
  }

  const { error } = await dbAdmin.auth.admin.updateUserById(id, {
    password: senha,
  });

  if (error) {
    console.error("Falha ao redefinir senha", { message: error.message });
    return { erro: "Não foi possível redefinir. Tente de novo." };
  }

  return {
    sucesso: usarTelefone
      ? "Senha voltou a ser o telefone (só os números)."
      : "Senha redefinida.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

/** Os quatro status, num lugar só. Ativar/desativar viraram casos deste. */
export async function mudarStatusCliente(
  idRecebido: string,
  statusRecebido: StatusCliente,
): Promise<EstadoCliente> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const id = idRecebido.trim();
  const status = statusValido(statusRecebido);
  if (!id || !status) return { erro: "Status inválido." };

  const { data: alterado, error } = await dbAdmin
    .from("clientes")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !alterado) {
    console.error("Falha ao mudar status de cliente", {
      code: error?.code,
      message: error?.message,
    });
    return { erro: "Não foi possível mudar o status. Tente de novo." };
  }

  revalidar(id);
  return { sucesso: "Status atualizado." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exclusão
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apaga o cliente de vez — do cadastro e do Auth.
 *
 * Existe para cadastro errado e para pedido de exclusão de dados (LGPD), não
 * para tirar da lista quem parou de comprar: para isso existe "inativo", que
 * remove o acesso e preserva o histórico. A tela diz isso antes de deixar
 * apagar.
 *
 * O `on delete cascade` da tabela sai junto quando o usuário do Auth morre.
 */
export async function excluirCliente(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = String(form.get("id") ?? "").trim();
  if (!id) return;

  const { error } = await dbAdmin.auth.admin.deleteUser(id);
  if (error) {
    console.error("Falha ao excluir cliente", { message: error.message });
    return;
  }

  // Cinto e suspensório: se a linha sobreviveu ao cascade, ela vai agora.
  await dbAdmin.from("clientes").delete().eq("id", id);

  revalidar();
  redirect("/painel");
}
