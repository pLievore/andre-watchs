import type { Metadata } from "next";
import { carregarDadosSite } from "../dados-site";
import { SiteTabShell } from "../SiteTabShell";

export const metadata: Metadata = {
  title: "A casa",
  description:
    "Andre Watches: relógios de luxo desde 2012. Como a procedência de cada peça é conferida antes de entrar no acervo.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const dados = await carregarDadosSite();

  return <SiteTabShell initialTab={2} {...dados} />;
}
