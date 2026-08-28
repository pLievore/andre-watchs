import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { PecaForm, type PecaEditavel } from "./PecaForm";

export const metadata: Metadata = { title: "Editar peça" };

export default async function EditarPecaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  const { slug } = await params;

  // Lê pela chave secret: o RLS só libera leitura para cliente ativo, e o
  // admin não é cliente. Ver docs/BANCO.md.
  const { data: peca } = await dbAdmin
    .from("pecas")
    .select(
      "slug, marca, modelo, condicao, integralidade, referencia, calibre, diametro_mm, material_caixa, pulseira, mostrador, ano_cartao, preco_centavos, disponivel, consignada, historia, notas_estado",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!peca) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link href="/painel/pecas" className="meta link-quiet">
          ← Peças
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {peca.marca} {peca.modelo}
        </h1>
        <Link href={`/acervo/${peca.slug}`} className="meta link-quiet">
          Ver como o cliente vê →
        </Link>
      </div>

      <PecaForm peca={peca as PecaEditavel} />
    </div>
  );
}
