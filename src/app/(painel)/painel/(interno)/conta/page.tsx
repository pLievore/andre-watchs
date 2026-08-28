import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";

import { ContaForm } from "./ContaForm";

export const metadata: Metadata = { title: "Conta" };

export default async function ContaAdminPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Conta
        </h1>
        <p className="meta">{admin.email}</p>
      </header>

      <div
        className="flex flex-col gap-5 border-t pt-8"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="label">Senha</h2>
          <p className="meta max-w-prose">
            Não pedimos a senha atual: a sessão aberta já prova quem é você.
          </p>
        </div>
        <ContaForm />
      </div>

      {/*
        O e-mail não é editável aqui de propósito, e vale dizer por quê — senão
        o Andre procura o campo e conclui que faltou fazer.
      */}
      <div
        className="flex flex-col gap-2 border-t pt-8"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="label">E-mail de acesso</h2>
        <p className="meta max-w-prose">
          O e-mail que administra o painel é definido na configuração do
          servidor (<code>ADMIN_EMAILS</code>), não aqui. Trocá-lo pela tela
          tiraria o acesso de quem está trocando — se precisar mudar, fale com
          quem cuida do deploy.
        </p>
      </div>
    </div>
  );
}
