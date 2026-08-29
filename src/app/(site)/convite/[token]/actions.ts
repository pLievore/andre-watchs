"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isAdminEmail } from "@/lib/admin";
import { dbAdmin } from "@/lib/db/admin";
import { dbServidor } from "@/lib/db/server";

export type EstadoResgate = { erro?: string; sucesso?: string };

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export async function resgatarConvite(
  tokenRecebido: string,
  _anterior: EstadoResgate,
  form: FormData,
): Promise<EstadoResgate> {
  const token = tokenRecebido.trim();
  if (!token) return { erro: "Convite inválido." };

  const { data: convite, error: erroBusca } = await dbAdmin
    .from("convites")
    .select("id, expira_em, usado_em")
    .eq("token", token)
    .maybeSingle();

  if (erroBusca || !convite) {
    return { erro: "Convite não encontrado ou inválido." };
  }

  if (convite.usado_em) {
    return { erro: "Este convite já foi utilizado." };
  }

  if (new Date(convite.expira_em) < new Date()) {
    return { erro: "Este convite expirou (validade de 7 dias)." };
  }

  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const telefone = String(form.get("telefone") ?? "").replace(/\D/g, "");
  const senha = String(form.get("senha") ?? "");

  if (!nome || nome.length < 2) {
    return { erro: "Informe seu nome completo." };
  }

  if (!emailValido(email)) {
    return { erro: "Informe um e-mail válido." };
  }

  if (isAdminEmail(email)) {
    return { erro: "Este e-mail é reservado à administração." };
  }

  if (!telefone || telefone.length < 8) {
    return { erro: "Informe um telefone válido para contato." };
  }

  if (!senha || senha.length < 6) {
    return { erro: "A senha deve ter pelo menos 6 caracteres." };
  }

  // 1. Cria a identidade no Supabase Auth
  const { data: authUser, error: erroAuth } =
    await dbAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, telefone },
    });

  if (erroAuth || !authUser?.user) {
    if (erroAuth?.message?.includes("already") || erroAuth?.code === "email_exists") {
      return { erro: "Este e-mail já possui cadastro. Acesse /acesso para entrar." };
    }
    return { erro: "Não foi possível criar o acesso. Tente novamente." };
  }

  // 2. Cria o cliente ativo na tabela `clientes`
  const { error: erroCliente } = await dbAdmin.from("clientes").insert({
    id: authUser.user.id,
    nome,
    email,
    telefone,
    status: "ativo",
  });

  if (erroCliente) {
    // Apaga usuário do Auth se falhar ao gravar cliente para não deixar órfão
    await dbAdmin.auth.admin.deleteUser(authUser.user.id);
    return { erro: "Falha ao registrar cliente. Tente novamente." };
  }

  // 3. Marca o convite como utilizado
  await dbAdmin
    .from("convites")
    .update({
      usado_em: new Date().toISOString(),
      cliente_id: authUser.user.id,
    })
    .eq("id", convite.id);

  // 4. Autentica a sessão do cliente imediatamente e direciona ao acervo
  try {
    const db = await dbServidor();
    await db.auth.signInWithPassword({ email, password: senha });
  } catch {
    // Se a auto-sessão falhar por cookie em headless, redireciona para login
    redirect("/acesso");
  }

  revalidatePath("/", "layout");
  redirect("/acervo?boas-vindas=1");
}