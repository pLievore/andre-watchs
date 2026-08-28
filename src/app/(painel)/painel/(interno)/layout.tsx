import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";

import { PainelNav } from "./PainelNav";

export const dynamic = "force-dynamic";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O middleware é a primeira barreira; esta é a segunda. Rota nova aqui dentro
  // fica coberta mesmo se alguém alterar o matcher do middleware sem perceber.
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  return (
    <div className="min-h-dvh">
      <PainelNav email={admin.email ?? ""} />

      {/*
        Margem à esquerda no desktop pela lateral fixa; embaixo no celular pela
        barra inferior. `pb-24` no mobile evita que a última linha da tabela
        fique atrás da navegação.
      */}
      <main id="conteudo" className="px-5 pb-24 pt-8 md:ml-56 md:px-10 md:pb-16 md:pt-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
