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
import { useMemo, useState } from "react";

import { WatchCard } from "@/components/watch/WatchCard";
import type { Watch } from "@/lib/types";

type Availability = "todas" | "disponiveis" | "vendidas";

const AVAILABILITY_FILTERS: readonly { id: Availability; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "disponiveis", label: "Disponíveis" },
  { id: "vendidas", label: "Vendidas" },
];

const ALL_BRANDS = "Todas as marcas";

interface CollectionGridProps {
  watches: readonly Watch[];
}

export function CollectionGrid({ watches }: CollectionGridProps) {
  const reduce = useReducedMotion();
  const [brand, setBrand] = useState<string>(ALL_BRANDS);
  const [availability, setAvailability] = useState<Availability>("todas");

  const brands = useMemo(
    () => [ALL_BRANDS, ...Array.from(new Set(watches.map((w) => w.brand))).sort()],
    [watches],
  );

  const filtered = useMemo(
    () =>
      watches.filter((w) => {
        if (brand !== ALL_BRANDS && w.brand !== brand) return false;
        if (availability === "disponiveis" && !w.available) return false;
        if (availability === "vendidas" && w.available) return false;
        return true;
      }),
    [watches, brand, availability],
  );

  return (
    <>
      <div
        className="mt-14 flex flex-col gap-6 border-y py-6 md:flex-row md:items-center md:justify-between"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          role="group"
          aria-label="Filtrar por marca"
        >
          {brands.map((b) => (
            <FilterButton
              key={b}
              label={b}
              active={brand === b}
              onSelect={() => setBrand(b)}
            />
          ))}
        </div>

        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-3"
          role="group"
          aria-label="Filtrar por disponibilidade"
        >
          {AVAILABILITY_FILTERS.map((f) => (
            <FilterButton
              key={f.id}
              label={f.label}
              active={availability === f.id}
              onSelect={() => setAvailability(f.id)}
            />
          ))}
        </div>
      </div>

      <p
        className="mt-6 label"
        aria-live="polite"
      >
        {filtered.length} {filtered.length === 1 ? "peça" : "peças"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-16 text-lg" style={{ color: "var(--color-muted)" }}>
          Nenhuma peça com esses filtros no momento.
        </p>
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
      className="label underline-offset-8 transition-colors duration-300 hover:underline"
      style={{
        color: active ? "var(--color-accent)" : "var(--color-muted)",
        transitionTimingFunction: "var(--ease-editorial)",
      }}
    >
      {label}
    </button>
  );
}
