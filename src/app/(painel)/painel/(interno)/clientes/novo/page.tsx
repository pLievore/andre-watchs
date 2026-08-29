import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";

import { NovoClienteForm } from "./NovoClienteForm";

export const metadata: Metadata = { title: "Cadastrar cliente" };

export default async function NovoClientePage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/painel" className="meta link-quiet">
          ← Clientes
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Cadastrar cliente
        </h1>
        <p className="meta max-w-prose">
          Para quem você já conhece — não precisa mandar a pessoa pedir acesso
          no site para você mesmo aprovar depois. A conta nasce pronta.
        </p>
      </div>

      <NovoClienteForm />
    </div>
  );
}
