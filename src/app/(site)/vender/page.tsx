import type { Metadata } from "next";
import { carregarDadosSite } from "../dados-site";
import { SiteTabShell } from "../SiteTabShell";
import { VenderView } from "../views/VenderView";

export const metadata: Metadata = {
  title: "Vender, trocar ou consignar",
  description:
    "A Andre Watches compra, aceita em troca e recebe em consignação relógios de luxo. Envie os dados da peça e receba uma avaliação.",
};

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const dados = await carregarDadosSite();

  // Visitante não navega por abas: sem acervo, o shell montaria as quatro
  // telas (incluindo a Conta, que não é dele) só para ficar de enfeite.
  if (!dados.podeVerAcervo) return <VenderView />;

  return <SiteTabShell initialTab={1} {...dados} />;
}
