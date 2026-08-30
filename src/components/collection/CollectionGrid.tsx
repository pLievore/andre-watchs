"use client";

/**
 * SPEC §11 — grid do acervo com filtro por marca e disponibilidade.
 *
 * Client component porque o filtro é estado local. O catálogo chega por prop
 * do server component (`/acervo/page.tsx`), então a fronteira client fica
 * baixa na árvore e a listagem continua renderizando no servidor.
 *
 * Reveal em stagger com `whileInView` (§3.4), `once: true` — a peça não
 * pisca de novo quando o usuário volta pra cima.
 */

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { WatchCard } from "@/components/watch/WatchCard";
import type { Watch } from "@/lib/types";

type Availability = "todas" | "disponiveis" | "reservadas" | "vendidas";

const AVAILABILITY_FILTERS: readonly { id: Availability; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "disponiveis", label: "Disponíveis" },
  { id: "reservadas", label: "Em negociação" },
  { id: "vendidas", label: "Vendidas" },
];

const ALL_BRANDS = "Todas as marcas";

type Ordem = "recentes" | "menor-preco" | "maior-preco";

/** `recentes` é a ordem em que a casa recebe as peças — a que vem do banco. */
const ORDENACOES: readonly { id: Ordem; label: string }[] = [
  { id: "recentes", label: "Recentes" },
  { id: "menor-preco", label: "Menor preço" },
  { id: "maior-preco", label: "Maior preço" },
];

interface CollectionGridProps {
  watches: readonly Watch[];
}

export function CollectionGrid({ watches }: CollectionGridProps) {
  const reduce = useReducedMotion();
  const [brand, setBrand] = useState<string>(ALL_BRANDS);
  const [availability, setAvailability] = useState<Availability>("todas");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [aberto, setAberto] = useState(false);
  const refFiltro = useRef<HTMLDivElement>(null);

  const brands = useMemo(
    () => [ALL_BRANDS, ...Array.from(new Set(watches.map((w) => w.brand))).sort()],
    [watches],
  );

  const filtered = useMemo(() => {
    const lista = watches.filter((w) => {
      if (brand !== ALL_BRANDS && w.brand !== brand) return false;
      if (availability === "disponiveis" && w.state !== "disponivel") return false;
      if (availability === "reservadas" && w.state !== "reservada") return false;
      if (availability === "vendidas" && w.state !== "vendida") return false;
      return true;
    });

    if (ordem === "recentes") return lista;

    // Cópia antes de ordenar: `watches` vem do servidor e é compartilhada.
    return [...lista].sort((a, b) =>
      ordem === "menor-preco"
        ? a.priceCents - b.priceCents
        : b.priceCents - a.priceCents,
    );
  }, [watches, brand, availability, ordem]);

  const quantidadeFiltros =
    (brand !== ALL_BRANDS ? 1 : 0) + (availability !== "todas" ? 1 : 0);
  const temFiltros = quantidadeFiltros > 0;

  function limparFiltros() {
    setBrand(ALL_BRANDS);
    setAvailability("todas");
    setOrdem("recentes");
  }

  // Fecha o filtro suspenso ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!aberto) return;

    const handleFora = (e: MouseEvent) => {
      if (!refFiltro.current?.contains(e.target as Node)) {
        setAberto(false);
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
      }
    };

    document.addEventListener("mousedown", handleFora);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleFora);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [aberto]);

  return (
    <>
      <div className="mt-12 flex flex-col gap-3">
        <div
          className="flex flex-wrap items-center justify-between gap-4 border-y py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p className="label" aria-live="polite">
            Mostrando {filtered.length} de {watches.length}{" "}
            {watches.length === 1 ? "peça" : "peças"}
          </p>

          <div ref={refFiltro} className="relative">
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              aria-expanded={aberto}
              aria-haspopup="dialog"
              aria-label="Filtrar peças do acervo"
              className="label flex items-center gap-2.5 border px-4 py-2 transition-colors"
              style={{
                minHeight: 42,
                borderColor:
                  aberto || temFiltros
                    ? "var(--color-foreground)"
                    : "var(--color-border)",
                background: aberto ? "var(--color-surface)" : "transparent",
                color: "var(--color-foreground)",
              }}
            >
              <FunnelIcon active={temFiltros} />
              <span>Filtrar</span>
              {quantidadeFiltros > 0 && (
                <span
                  className="grid h-4.5 w-4.5 place-items-center rounded-full text-[10px] font-mono leading-none"
                  style={{
                    background: "var(--color-foreground)",
                    color: "var(--color-background)",
                  }}
                >
                  {quantidadeFiltros}
                </span>
              )}
              <span
                aria-hidden
                className="transition-transform duration-200"
                style={{
                  transform: aberto ? "rotate(180deg)" : "none",
                  color: "var(--color-muted)",
                  fontSize: "0.65rem",
                }}
              >
                ▼
              </span>
            </button>

            {/* Painel suspenso de filtros */}
            {aberto && (
              <div
                role="dialog"
                aria-label="Filtros do acervo"
                className="absolute right-0 top-full z-40 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] border p-5 shadow-xl sm:p-6"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-background)",
                  boxShadow:
                    "0 18px 38px -6px rgba(23, 24, 26, 0.16), 0 0 0 1px var(--color-border)",
                }}
              >
                {/* Cabeçalho do menu suspenso */}
                <div
                  className="flex items-center justify-between border-b pb-4"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="label text-sm uppercase tracking-wider"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      Filtrar acervo
                    </span>
                    {quantidadeFiltros > 0 && (
                      <span className="meta">
                        ({quantidadeFiltros} ativo{quantidadeFiltros > 1 ? "s" : ""})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {temFiltros && (
                      <button
                        type="button"
                        onClick={limparFiltros}
                        className="meta link-quiet hover:underline"
                        style={{ color: "var(--color-muted)" }}
                      >
                        Limpar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAberto(false)}
                      className="grid h-7 w-7 place-items-center border text-xs transition-colors"
                      style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-muted)",
                      }}
                      aria-label="Fechar menu de filtros"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Filtro de Marca */}
                <div className="mt-4">
                  <label
                    htmlFor="filtro-marca-suspenso"
                    className="label mb-2 block"
                  >
                    Marca
                  </label>
                  <select
                    id="filtro-marca-suspenso"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    className="campo w-full cursor-pointer"
                  >
                    {brands.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                {/*
                  Ordenação.

                  Três opções cobrem o que se pede num catálogo, e nenhuma
                  delas inventa hierarquia: "recentes" é a ordem da casa (o
                  que chegou por último aparece antes), e as de preço são fato,
                  não recomendação. Sem "relevância", que ninguém sabe explicar.
                */}
                <div className="mt-5">
                  <span className="label mb-2 block">Ordenar por</span>
                  <div className="grid grid-cols-3 gap-2">
                    {ORDENACOES.map((opcao) => (
                      <FilterButton
                        key={opcao.id}
                        label={opcao.label}
                        active={ordem === opcao.id}
                        onSelect={() => setOrdem(opcao.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Filtro de Situação */}
                <div className="mt-5">
                  <span className="label mb-2 block">Situação</span>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABILITY_FILTERS.map((filtro) => (
                      <FilterButton
                        key={filtro.id}
                        label={filtro.label}
                        active={availability === filtro.id}
                        onSelect={() => setAvailability(filtro.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Rodapé do painel */}
                <div
                  className="mt-6 flex items-center justify-between border-t pt-4"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span className="meta">
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "peça encontrada" : "peças encontradas"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className="btn btn-primary px-4 py-2 text-xs"
                  >
                    Ver resultados
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chips de filtros ativos quando aplicados */}
        {temFiltros && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="meta">Filtros ativos:</span>
            {brand !== ALL_BRANDS && (
              <button
                type="button"
                onClick={() => setBrand(ALL_BRANDS)}
                className="meta flex items-center gap-1.5 border px-2.5 py-1 transition-colors hover:border-[var(--color-foreground)]"
                style={{ borderColor: "var(--color-border)" }}
                title="Remover filtro de marca"
              >
                <span>{brand}</span>
                <span aria-hidden className="text-xs">
                  ✕
                </span>
              </button>
            )}
            {availability !== "todas" && (
              <button
                type="button"
                onClick={() => setAvailability("todas")}
                className="meta flex items-center gap-1.5 border px-2.5 py-1 transition-colors hover:border-[var(--color-foreground)]"
                style={{ borderColor: "var(--color-border)" }}
                title="Remover filtro de situação"
              >
                <span>
                  {AVAILABILITY_FILTERS.find((f) => f.id === availability)?.label}
                </span>
                <span aria-hidden className="text-xs">
                  ✕
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={limparFiltros}
              className="meta link-quiet ml-1 text-xs"
              style={{ color: "var(--color-muted)" }}
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        /*
         * Estado vazio com saída: a frase sozinha deixava a pessoa numa tela
         * sem caminho, com o botão de limpar lá em cima, fora de onde o olho
         * está. Quem filtrou até zerar quer voltar atrás em um toque.
         */
        <div className="mt-16 flex flex-col items-start gap-5">
          <p className="text-lg" style={{ color: "var(--color-muted)" }}>
            Nenhuma peça com esses filtros no momento.
          </p>
          <button
            type="button"
            onClick={limparFiltros}
            className="btn btn-ghost"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((watch, i) => (
            <motion.li
              key={watch.slug}
              className="flex justify-center"
              initial={reduce ? undefined : { opacity: 0, y: 28 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.8,
                delay: Math.min(i, 3) * 0.12,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <WatchCard watch={watch} />
            </motion.li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterButton({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className="label border px-3 py-2.5 text-center transition-colors duration-300"
      style={{
        minHeight: 42,
        borderColor: active ? "var(--color-foreground)" : "var(--color-border)",
        background: active ? "var(--color-foreground)" : "transparent",
        color: active ? "var(--color-background)" : "var(--color-muted)",
        transitionTimingFunction: "var(--ease-editorial)",
      }}
    >
      {label}
    </button>
  );
}

function FunnelIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        color: active ? "var(--color-foreground)" : "var(--color-muted)",
      }}
    >
      <path d="M4 5h16l-6.2 7.1v5.5l-3.6 1.8v-7.3L4 5Z" />
    </svg>
  );
}
