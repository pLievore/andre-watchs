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

import { useEffect, useState } from "react";

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
  const [lightboxAberto, setLightboxAberto] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Lavagem clara: o fallback antigo era escuro, herdado da identidade anterior,
  // e sobre papel viraria uma placa preta no meio da página.
  const gradient = watch.placeholderGradient ?? ["#eeebe4", "#f7f5f0"];

  const current = images[active] ?? images[0]!;

  // Efeito de teclado e trava de scroll no lightbox
  useEffect(() => {
    if (!lightboxAberto) return;

    function tratarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxAberto(false);
        setZoom(false);
      } else if (e.key === "ArrowLeft") {
        setActive((prev) => (prev > 0 ? prev - 1 : images.length - 1));
        setZoom(false);
      } else if (e.key === "ArrowRight") {
        setActive((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        setZoom(false);
      }
    }

    const scrollOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", tratarTecla);

    return () => {
      document.body.style.overflow = scrollOriginal;
      window.removeEventListener("keydown", tratarTecla);
    };
  }, [lightboxAberto, images.length]);

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
        <p className="meta">Fotos desta peça em produção</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div
          className="group relative aspect-[4/5] w-full overflow-hidden border cursor-zoom-in"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
          onClick={() => setLightboxAberto(true)}
          title="Clique para ver em tela cheia com zoom macro"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.url}
            alt={current.alt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            decoding="async"
          />

          <span
            className="meta absolute bottom-3 right-3 border px-2.5 py-1 text-[11px] backdrop-blur-md opacity-80 group-hover:opacity-100 transition-opacity"
            style={{
              background: "rgba(6, 7, 8, 0.75)",
              borderColor: "var(--color-border)",
              color: "#fff",
            }}
          >
            Zoom Macro 🔍
          </span>
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

      {/* ── Modal Lightbox Fullscreen ───────────────────────────────────── */}
      {lightboxAberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualizador macro: ${watch.brand} ${watch.model}`}
          className="fixed inset-0 z-[9999] flex flex-col justify-between p-4 sm:p-8 select-none animate-in fade-in duration-200"
          style={{
            background: "rgba(6, 7, 8, 0.96)",
            backdropFilter: "blur(12px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxAberto(false);
              setZoom(false);
            }
          }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4 z-10 border-b pb-3" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}>
            <div className="flex items-center gap-3">
              <span className="label text-xs" style={{ color: "var(--color-accent)" }}>
                {watch.brand} {watch.model}
              </span>
              <span className="meta text-xs">·</span>
              <span className="meta text-xs font-mono">
                {active + 1} de {images.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="btn btn-ghost text-xs py-1.5 px-3"
                title="Alternar zoom macro 2x"
              >
                {zoom ? "1x Normal" : "2x Macro"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxAberto(false);
                  setZoom(false);
                }}
                className="flex items-center gap-2 border px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all hover:bg-white hover:text-black cursor-pointer"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.45)",
                  background: "rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                }}
                aria-label="Fechar visualizador"
              >
                <span className="font-semibold">Fechar</span>
                <span aria-hidden className="text-sm font-bold leading-none">✕</span>
              </button>
            </div>
          </div>

          {/* Imagem Central */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-auto my-2"
            onClick={() => setZoom((z) => !z)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.alt}
              className={`max-h-[80vh] w-auto max-w-full object-contain transition-transform duration-300 ${
                zoom ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
          </div>

          {/* Bottom Bar com Navegação, Alt e Fechar mobile */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 z-10 border-t pt-3" style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}>
            <p className="meta text-xs max-w-xl truncate text-center sm:text-left">
              {current.alt}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActive((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  setZoom(false);
                }}
                className="btn btn-ghost text-sm px-3 py-1.5"
                aria-label="Foto anterior"
              >
                ← Anterior
              </button>
              <button
                type="button"
                onClick={() => {
                  setActive((prev) => (prev < images.length - 1 ? prev + 1 : 0));
                  setZoom(false);
                }}
                className="btn btn-ghost text-sm px-3 py-1.5"
                aria-label="Próxima foto"
              >
                Próxima →
              </button>
              <button
                type="button"
                onClick={() => {
                  setLightboxAberto(false);
                  setZoom(false);
                }}
                className="btn btn-ghost text-xs px-3 py-1.5 sm:hidden border"
                style={{ borderColor: "rgba(255, 255, 255, 0.3)", color: "#fff" }}
              >
                Fechar ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
        className="p-4 meta"
      >
        {label}
      </span>
    </div>
  );
}
