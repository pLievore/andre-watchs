"use client";

/**
 * SPEC §6.1 / §6.2 — galeria da PDP.
 *
 * Desktop: foto principal grande + miniaturas abaixo.
 * Mobile: mesma pilha, largura cheia.
 *
 * ⚠️ Enquanto não há fotos do estoque (SPEC §14 D8), a galeria renderiza placas
 * vazias com o gradiente da marca e o rótulo do enquadramento que falta. É
 * proposital: melhor um vazio declarado do que uma imagem que não é da peça.
 */

import { useState } from "react";

import type { Watch } from "@/lib/types";

/** Enquadramentos que a casa fotografa por peça (SPEC §6.1). */
const EXPECTED_SHOTS = [
  "Frontal",
  "Perfil da caixa",
  "Fecho",
  "Verso",
  "Macro do mostrador",
  "Caixa e documentos",
] as const;

interface WatchGalleryProps {
  watch: Watch & { placeholderGradient?: readonly [string, string] };
}

export function WatchGallery({ watch }: WatchGalleryProps) {
  const images = [
    watch.images.primary,
    ...(watch.images.secondary ? [watch.images.secondary] : []),
    ...(watch.images.gallery ?? []),
  ].filter((img) => img.url !== "");

  const [active, setActive] = useState(0);
  const gradient = watch.placeholderGradient ?? ["#16191c", "#08090a"];

  if (images.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PlaceholderPlate gradient={gradient} label="Frontal" tall />
        <ul className="grid grid-cols-3 gap-4">
          {EXPECTED_SHOTS.slice(1).map((label) => (
            <li key={label}>
              <PlaceholderPlate gradient={gradient} label={label} />
            </li>
          ))}
        </ul>
        <p
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-muted)",
          }}
        >
          Fotos desta peça em produção
        </p>
      </div>
    );
  }

  const current = images[active] ?? images[0]!;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative aspect-[4/5] w-full overflow-hidden border"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt}
          className="h-full w-full object-cover"
          decoding="async"
        />
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-4 gap-4">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}: ${img.alt}`}
                aria-current={i === active}
                className="relative block aspect-square w-full overflow-hidden border transition-opacity duration-300"
                style={{
                  borderColor:
                    i === active ? "var(--color-accent)" : "var(--color-border)",
                  opacity: i === active ? 1 : 0.6,
                  transitionTimingFunction: "var(--ease-editorial)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlaceholderPlate({
  gradient,
  label,
  tall = false,
}: {
  gradient: readonly [string, string] | string[];
  label: string;
  tall?: boolean;
}) {
  return (
    <div
      className={`relative flex w-full items-end border ${tall ? "aspect-[4/5]" : "aspect-square"}`}
      style={{
        borderColor: "var(--color-border)",
        background: `radial-gradient(110% 85% at 50% 25%, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
      }}
    >
      <span
        className="p-4 text-[9px] uppercase tracking-[0.3em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}
