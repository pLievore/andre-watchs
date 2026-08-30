import type { Metadata } from "next";
import { carregarDadosSite } from "../dados-site";
import { SiteTabShell } from "../SiteTabShell";
import { SobreView } from "../views/SobreView";

export const metadata: Metadata = {
  title: "A casa",
  description:
    "Andre Watches: relógios de luxo desde 2012. Como a procedência de cada peça é conferida antes de entrar no acervo.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const dados = await carregarDadosSite();

  // Visitante não navega por abas: sem acervo, o shell montaria as quatro
  // telas (incluindo a Conta, que não é dele) só para ficar de enfeite.
  if (!dados.podeVerAcervo) return <SobreView />;

  return <SiteTabShell initialTab={2} {...dados} />;
}
