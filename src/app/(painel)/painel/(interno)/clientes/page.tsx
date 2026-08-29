import { redirect } from "next/navigation";

/** Compatibilidade com links antigos: a central de clientes agora vive no painel. */
export default async function ClientesLegadoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/painel?q=${encodeURIComponent(q)}` : "/painel");
}
