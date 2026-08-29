import type { Metadata } from "next";
import { carregarDadosPainel } from "../dados-painel";
import { PainelTabShell } from "../PainelTabShell";

export const metadata: Metadata = { title: "Dashboard & Inteligência" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dados = await carregarDadosPainel();

  return <PainelTabShell initialTab={1} {...dados} />;
}