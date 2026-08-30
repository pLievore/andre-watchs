import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { carregarDadosSite } from "../../dados-site";
import { SiteTabShell } from "../../SiteTabShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha conta",
  description: "Dados de acesso e contato na Andre Watches.",
  robots: { index: false, follow: false },
  // O acervo é fechado: nada de imagem de compartilhamento.
  openGraph: { images: [] },
};

export default async function ContaPage() {
  const dados = await carregarDadosSite();

  if (!dados.isAdmin && !dados.cliente) {
    redirect("/acesso");
  }

  return <SiteTabShell initialTab={3} {...dados} />;
}
