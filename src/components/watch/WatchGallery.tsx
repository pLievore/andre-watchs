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

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  const reduzirMovimento = useReducedMotion();
  const [active, setActive] = useState(0);
  const [lightboxAberto, setLightboxAberto] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lavagem clara: o fallback antigo era escuro, herdado da identidade anterior,
  // e sobre papel viraria uma placa preta no meio da página.
  const gradient = watch.placeholderGradient ?? ["#eeebe4", "#f7f5f0"];

  const current = images[active] ?? images[0]!;

  const irPara = (passo: number) => {
    setActive((prev) => {
      const total = images.length;
      return (prev + passo + total) % total;
    });
    setZoom(false);
  };

  /*
   * Deslizar troca de foto dentro do visualizador.
   *
   * Antes só havia seta e teclado — num celular, onde a foto ocupa a tela
   * inteira, o dedo é o caminho óbvio. Com o zoom ligado o gesto é do
   * navegador (arrastar a foto ampliada), então aqui ele não interfere.
   */
  const toqueRef = useRef<{ x: number; y: number } | null>(null);

  const aoTocarInicio = (e: React.TouchEvent) => {
    if (zoom || images.length < 2 || e.touches.length !== 1) {
      toqueRef.current = null;
      return;
    }
    const toque = e.touches[0]!;
    toqueRef.current = { x: toque.clientX, y: toque.clientY };
  };

  const aoTocarFim = (e: React.TouchEvent) => {
    const inicio = toqueRef.current;
    toqueRef.current = null;
    if (!inicio) return;

    const toque = e.changedTouches[0];
    if (!toque) return;

    const deltaX = toque.clientX - inicio.x;
    const deltaY = toque.clientY - inicio.y;

    // Só conta como troca de foto o gesto claramente horizontal: subir ou
    // descer o dedo é intenção de fechar ou de nada, não de navegar.
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

    irPara(deltaX < 0 ? 1 : -1);
  };

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
            // Desfoque atrás da foto: o quadro nunca fica vazio enquanto ela
            // desce, e some sozinho quando a real cobre.
            ...(current.blur
              ? {
                  backgroundImage: `url("${current.blur}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {}),
          }}
          onClick={() => setLightboxAberto(true)}
          title="Clique para ver em tela cheia com zoom macro"
        >
          {/*
            A miniatura de 1000px basta para este quadro e chega muito antes.
            A original fica para o visualizador em tela cheia, que é onde a
            pessoa amplia de verdade.
          */}
          {/*
            A foto assenta ao chegar: entra 2% maior e desfocada e resolve no
            lugar, em vez de aparecer de uma vez sobre o desfoque. É a
            continuidade que se pode prometer sem depender da velocidade da
            rede — quem tem `prefers-reduced-motion` recebe a foto pronta.
          */}
          <motion.img
            key={current.url}
            src={current.thumbUrl || current.url}
            alt={current.alt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            decoding="async"
            initial={reduzirMovimento ? false : { opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
                    src={img.thumbUrl || img.url}
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

      {/* ── Modal Lightbox Fullscreen (Montado diretamente no body via Portal) ── */}
      {lightboxAberto && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualizador macro: ${watch.brand} ${watch.model}`}
          /*
           * `data-no-swipe`: o shell de abas escuta o toque na janela inteira,
           * e sem esta marca um deslize sobre a foto ampliada arrastava a aba
           * atrás do visualizador. Aqui dentro o gesto é outro — trocar de
           * foto (`aoTocar*`, abaixo).
           */
          data-no-swipe
          onTouchStart={aoTocarInicio}
          onTouchEnd={aoTocarFim}
          className="fixed inset-0 z-[999999] flex flex-col justify-between p-4 sm:p-8 select-none animate-in fade-in duration-200"
          style={{
            background: "rgba(6, 7, 8, 0.98)",
            backdropFilter: "blur(16px)",
            paddingTop: "max(1.25rem, env(safe-area-inset-top))",
            paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLightboxAberto(false);
              setZoom(false);
            }
          }}
        >
          {/* Top Bar com Botão Fechar em Alto Destaque */}
          <div
            className="flex items-center justify-between gap-4 z-20 border-b pb-3"
            style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="label text-xs truncate" style={{ color: "var(--color-accent)" }}>
                {watch.brand} {watch.model}
              </span>
              <span className="meta text-xs shrink-0">·</span>
              <span className="meta text-xs font-mono shrink-0">
                {active + 1} / {images.length}
              </span>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoom((z) => !z)}
                className="btn btn-ghost text-xs py-1.5 px-3 hidden sm:inline-flex"
                title="Alternar zoom macro 2x"
              >
                {zoom ? "1x Normal" : "2x Macro"}
              </button>

              {/* Botão Fechar Primário — Super Visível no Mobile */}
              <button
                type="button"
                onClick={() => {
                  setLightboxAberto(false);
                  setZoom(false);
                }}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all bg-white text-black hover:bg-neutral-200 active:scale-95 cursor-pointer shadow-xl"
                aria-label="Fechar visualizador"
              >
                <span>Fechar</span>
                <span aria-hidden className="text-sm font-bold leading-none">✕</span>
              </button>
            </div>
          </div>

          {/* Imagem Central */}
          <div
            className="relative flex-1 flex items-center justify-center overflow-auto my-2 touch-pinch-zoom"
            onClick={() => setZoom((z) => !z)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.alt}
              className={`max-h-[75vh] w-auto max-w-full object-contain transition-transform duration-300 ${
                zoom ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"
              }`}
            />
          </div>

          {/* Bottom Bar com Navegação */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-3 z-20 border-t pt-3"
            style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
          >
            <p className="meta text-xs max-w-xl truncate text-center sm:text-left text-neutral-300">
              {current.alt}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActive((prev) => (prev > 0 ? prev - 1 : images.length - 1));
                  setZoom(false);
                }}
                className="btn btn-ghost text-xs sm:text-sm px-3.5 py-1.5 border border-white/20 text-white"
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
                className="btn btn-ghost text-xs sm:text-sm px-3.5 py-1.5 border border-white/20 text-white"
                aria-label="Próxima foto"
              >
                Próxima →
              </button>
            </div>
          </div>
        </div>,
        document.body
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
