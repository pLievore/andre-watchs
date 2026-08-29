import type { Metadata } from "next";
import { carregarDadosPainel } from "../dados-painel";
import { PainelTabShell } from "../PainelTabShell";

export const metadata: Metadata = { title: "Peças" };
export const dynamic = "force-dynamic";

export default async function PainelPecasPage() {
  const dados = await carregarDadosPainel();

  return <PainelTabShell initialTab={3} {...dados} />;
}
