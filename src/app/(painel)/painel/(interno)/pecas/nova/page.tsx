import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";

import { NovaPecaForm } from "./NovaPecaForm";

export const metadata: Metadata = { title: "Cadastrar peça" };

export default async function NovaPecaPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/painel/pecas" className="meta link-quiet">
          ← Peças
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Cadastrar peça
        </h1>
        <p className="meta max-w-prose">
          O básico e as fotos agora; os detalhes podem ser completados na tela
          seguinte. Campo que você não tem confirmado fica vazio — a vitrine
          mostra travessão, e isso é melhor do que um dado errado.
        </p>
      </div>

      <NovaPecaForm />
    </div>
  );
}
