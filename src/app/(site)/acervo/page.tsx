import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { carregarDadosSite } from "../dados-site";
import { SiteTabShell } from "../SiteTabShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acervo",
  description: "Acervo reservado aos clientes da Andre Watches.",
  robots: { index: false, follow: false },
  // O acervo é fechado: nada de imagem de compartilhamento.
  openGraph: { images: [] },
};

export default async function AcervoPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const dados = await carregarDadosSite(params);

  if (!dados.isAdmin && !dados.cliente) {
    redirect("/acesso");
  }

  return <SiteTabShell initialTab={0} {...dados} />;
}
