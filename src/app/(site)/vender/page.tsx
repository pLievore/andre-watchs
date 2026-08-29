import type { Metadata } from "next";
import { carregarDadosSite } from "../dados-site";
import { SiteTabShell } from "../SiteTabShell";

export const metadata: Metadata = {
  title: "Vender, trocar ou consignar",
  description:
    "A Andre Watches compra, aceita em troca e recebe em consignação relógios de luxo. Envie os dados da peça e receba uma avaliação.",
};

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const dados = await carregarDadosSite();

  return <SiteTabShell initialTab={1} {...dados} />;
}
