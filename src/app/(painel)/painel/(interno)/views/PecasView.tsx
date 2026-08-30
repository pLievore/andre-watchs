"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatPrice } from "@/lib/format";
import { SeletorEstado, type Estado } from "../pecas/SeletorEstado";

/** Os mesmos três estados do acervo, mais "tudo". A ordem espelha a do card. */
const FILTROS: readonly { id: Estado | "tudo"; label: string }[] = [
  { id: "tudo", label: "Tudo" },
  { id: "disponivel", label: "Disponíveis" },
  { id: "reservada", label: "Em negociação" },
  { id: "vendida", label: "Vendidas" },
];

export interface LinhaPeca {
  slug: string;
  marca: string;
  modelo: string;
  referencia: string | null;
  preco_centavos: number;
  estado: Estado;
  consignada: boolean;
  fotos: { count: number }[];
}

interface PecasViewProps {
  pecas: LinhaPeca[];
}

export function PecasView({ pecas }: PecasViewProps) {
  const total = pecas.length;
  const conta = (e: Estado) => pecas.filter((p) => p.estado === e).length;

  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Estado | "tudo">("tudo");

  /*
   * Buscar e filtrar aqui, no navegador: a lista inteira já veio com a página,
   * e uma ida ao servidor por letra digitada só acrescentaria espera. Se um dia
   * o acervo passar de algumas centenas de peças, isto vira consulta no banco.
   */
  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pecas.filter((p) => {
      if (filtro !== "tudo" && p.estado !== filtro) return false;
      if (!termo) return true;
      return (
        p.marca.toLowerCase().includes(termo) ||
        p.modelo.toLowerCase().includes(termo) ||
        (p.referencia?.toLowerCase().includes(termo) ?? false)
      );
    });
  }, [pecas, busca, filtro]);

  const filtrando = busca.trim() !== "" || filtro !== "tudo";

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
        <section className="flex flex-col gap-4" aria-label="Lista de peças">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-50"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="busca-pecas"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por marca, modelo ou referência..."
                aria-label="Buscar peças"
                className="campo w-full pl-10 pr-4 text-xs sm:text-sm"
                style={{ minHeight: 42 }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTROS.map((opcao) => {
                const ativo = filtro === opcao.id;
                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => setFiltro(opcao.id)}
                    aria-pressed={ativo}
                    className="label border px-3 py-1.5 text-xs transition-colors"
                    style={{
                      minHeight: 34,
                      borderColor: ativo
                        ? "var(--color-accent)"
                        : "var(--color-border)",
                      background: ativo
                        ? "var(--color-surface-2)"
                        : "transparent",
                      color: ativo
                        ? "var(--color-foreground)"
                        : "var(--color-muted)",
                    }}
                  >
                    {opcao.label}
                  </button>
                );
              })}
            </div>

            {filtrando && (
              <p className="meta text-xs" aria-live="polite">
                {listaFiltrada.length} de {total}
                {listaFiltrada.length === 1 ? " peça" : " peças"}
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setFiltro("tudo");
                  }}
                  className="link-quiet underline"
                >
                  mostrar tudo
                </button>
              </p>
            )}
          </div>

          {listaFiltrada.length === 0 ? (
            <div
              className="border px-6 py-10 text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p style={{ color: "var(--color-foreground)" }}>
                Nenhuma peça encontrada.
              </p>
              <p className="meta mt-2">
                Tente outra marca, modelo ou referência.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:gap-3.5">
              {listaFiltrada.map((p) => {
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
        </section>
      )}
    </div>
  );
}
