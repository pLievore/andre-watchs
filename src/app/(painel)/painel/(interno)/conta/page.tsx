import type { Metadata } from "next";
import { carregarDadosPainel } from "../dados-painel";
import { PainelTabShell } from "../PainelTabShell";

export const metadata: Metadata = { title: "Conta" };
export const dynamic = "force-dynamic";

export default async function ContaAdminPage() {
  const dados = await carregarDadosPainel();

  return <PainelTabShell initialTab={4} {...dados} />;
}
