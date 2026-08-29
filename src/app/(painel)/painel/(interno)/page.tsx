import type { Metadata } from "next";
import { carregarDadosPainel } from "./dados-painel";
import { PainelTabShell } from "./PainelTabShell";

export const metadata: Metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

export default async function PainelClientesPage() {
  const dados = await carregarDadosPainel();

  return <PainelTabShell initialTab={0} {...dados} />;
}