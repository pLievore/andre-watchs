import type { Metadata } from "next";
import { carregarDadosPainel } from "../dados-painel";
import { PainelTabShell } from "../PainelTabShell";

export const metadata: Metadata = { title: "Negociações & Funil" };
export const dynamic = "force-dynamic";

export default async function PainelNegociacoesPage() {
  const dados = await carregarDadosPainel();

  return <PainelTabShell initialTab={2} {...dados} />;
}