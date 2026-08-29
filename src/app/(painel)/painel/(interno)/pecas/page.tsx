import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { formatPrice } from "@/lib/format";

import { SeletorEstado, type Estado } from "./SeletorEstado";

export const metadata: Metadata = { title: "Peças" };

interface LinhaLista {
  slug: string;
  marca: string;
  modelo: string;
  referencia: string | null;
  preco_centavos: number;
  estado: Estado;
  consignada: boolean;
  fotos: { count: number }[];
}

export default async function PainelPecasPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  // Disponíveis primeiro, depois em negociação, depois vendidas: é a ordem em
  // que o Andre pensa no estoque. A ordem do enum já entrega isso.
  const { data } = await dbAdmin
    .from("pecas")
    .select(
      "slug, marca, modelo, referencia, preco_centavos, estado, consignada, fotos(count)",
    )
    .order("estado", { ascending: true })
    .order("criado_em", { ascending: false });

  const pecas = (data ?? []) as unknown as LinhaLista[];
  const total = pecas.length;
  const conta = (e: Estado) => pecas.filter((p) => p.estado === e).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Peças
          </h1>
          <p className="meta">
            {conta("disponivel")} disponíve
            {conta("disponivel") === 1 ? "l" : "is"}
            {conta("reservada") > 0 && ` · ${conta("reservada")} em negociação`}
            {conta("vendida") > 0 && ` · ${conta("vendida")} vendida${conta("vendida") === 1 ? "" : "s"}`}
            {" · "}
            {total} no acervo
          </p>
        </div>

        <Link href="/painel/pecas/nova" className="btn btn-primary self-start">
          Cadastrar peça
        </Link>
      </header>

      {total === 0 ? (
        <div
          className="border px-6 py-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p style={{ color: "var(--color-foreground)" }}>
            Nenhuma peça cadastrada ainda.
          </p>
          <p className="meta mx-auto mt-2 max-w-sm">
            Cadastre a primeira: marca, modelo e preço bastam para começar. As
            fotos e as especificações entram depois, na tela da peça.
          </p>
          <Link
            href="/painel/pecas/nova"
            className="btn btn-primary mt-6 inline-flex"
          >
            Cadastrar a primeira peça
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:gap-3.5">
          {pecas.map((p) => {
            const fotos = p.fotos?.[0]?.count ?? 0;
            const vendida = p.estado === "vendida";
            return (
              <li
                key={p.slug}
                className="group flex flex-col justify-between gap-3.5 p-4 sm:p-5 border transition-all duration-200 hover:border-[var(--color-foreground)]"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="meta text-[11px] uppercase tracking-wider">{p.marca}</span>
                    <Link
                      href={`/painel/pecas/${p.slug}`}
                      className="font-medium text-base sm:text-lg truncate hover:underline"
                      style={{
                        fontFamily: "var(--font-display)",
                        color: vendida
                          ? "var(--color-muted)"
                          : "var(--color-foreground)",
                      }}
                    >
                      {p.modelo}
                    </Link>
                    <div className="flex items-center gap-2 text-xs flex-wrap mt-0.5" style={{ color: "var(--color-muted)" }}>
                      <span>{p.referencia ? `Ref. ${p.referencia}` : "Sem referência"}</span>
                      {p.consignada && <span>· Consignada</span>}
                      <span>·</span>
                      <span
                        style={{
                          color: fotos === 0 ? "var(--estado-alerta)" : undefined,
                        }}
                      >
                        {fotos === 0
                          ? "⚠️ sem fotos"
                          : `${fotos} foto${fotos === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <span className="text-base font-mono font-medium" style={{ color: "var(--color-foreground)" }}>
                      {formatPrice(p.preco_centavos)}
                    </span>
                    <Link
                      href={`/painel/pecas/${p.slug}`}
                      className="label shrink-0 border px-3 py-1 text-xs inline-flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{
                        minHeight: 34,
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      <span>Editar</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between gap-3 pt-3 border-t text-xs"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="meta text-xs">Status no acervo:</span>
                  <SeletorEstado slug={p.slug} estado={p.estado} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
