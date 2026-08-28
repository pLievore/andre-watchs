"use client";

/**
 * CTA de fechamento da home — texto à esquerda, 3 peças orbitando à direita.
 *
 * Velocidade variável FLUIDA: a rotação é integrada por RAF a partir de uma
 * velocidade que oscila suavemente (raised cosine) entre lenta e bem rápida.
 * Como integramos a velocidade (nunca setamos posição com easing por trecho),
 * não existe salto/"freio" — acelera e desacelera continuamente, em loop.
 *
 * Cada foto contra-rotaciona (negAngle) pra ficar sempre na vertical.
 * Respeita prefers-reduced-motion (§3.4/§10) → estático no triângulo.
 */

import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";

import Image from "next/image";

import { WhatsappCta } from "@/components/contact/WhatsappCta";

/** ⚠️ DEMO: fotos do Unsplash, não são peças da casa (ver watches.ts). */
const COLLAGE = [
  {
    src: "/pecas/orbe-1.webp",
    alt: "Rolex Submariner Date two-tone com mostrador azul",
  },
  {
    src: "/pecas/orbe-2.webp",
    alt: "Rolex Cosmograph Daytona em ouro amarelo",
  },
  {
    src: "/pecas/orbe-3.webp",
    alt: "Rolex Datejust two-tone com mostrador chocolate e índices de diamante",
  },
] as const;

// Vértices do triângulo: x = r·sin(θ), y = -r·cos(θ), θ = i·120°.
const SLOTS = [
  { x: "0px", y: "calc(-1 * var(--r))" },
  { x: "calc(0.866 * var(--r))", y: "calc(0.5 * var(--r))" },
  { x: "calc(-0.866 * var(--r))", y: "calc(0.5 * var(--r))" },
] as const;

// Perfil de velocidade (graus/seg) ao longo de um ciclo de PERIOD_MS.
const PERIOD_MS = 10_000; // 10s por ciclo (≈5s mais lento + ≈5s mais rápido)
const V_MIN = 8; // velocidade na fase suave
const V_MAX = 115; // pico na fase rápida ("bem rápida")

export function ClosingCta() {
  const reduce = useReducedMotion();
  const angle = useMotionValue(0);
  const negAngle = useTransform(angle, (a) => -a);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let start: number | null = null;
    let last: number | null = null;

    const tick = (ts: number) => {
      if (start === null || last === null) {
        start = ts;
        last = ts;
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = (ts - last) / 1000;
      last = ts;
      // fase 0..1 no ciclo; raised cosine = aceleração/desaceleração suaves
      const phase = ((ts - start) % PERIOD_MS) / PERIOD_MS;
      const v = V_MIN + (V_MAX - V_MIN) * (1 - Math.cos(2 * Math.PI * phase)) / 2;
      angle.set(angle.get() + v * dt);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [angle, reduce]);

  return (
    <section
      className="relative z-10 overflow-hidden border-t"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-16 px-6 py-24 md:flex-row md:items-center md:justify-between md:gap-20 md:px-16 md:py-32">
        {/* Texto + CTA */}
        <div className="flex flex-col items-start gap-8 md:flex-1">
          <p
            className="label"
          >
            Compra · Venda · Troca · Consignação
          </p>
          <h2
            className="max-w-2xl text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
            }}
          >
            A próxima peça começa numa conversa.
          </h2>
          {/* SPEC §7 — conversão é conversa; o acervo é o caminho secundário. */}
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <WhatsappCta
              variant="primary"
              label="Falar com a casa"
              context="Vim pelo site e quero conversar sobre comprar, vender ou trocar uma peça."
            />
            <Link
              href="/acesso"
              className="btn btn-ghost group"
            >
              Acessar o acervo
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Orbital — 3 peças girando com velocidade variável fluida */}
        <div
          className="relative shrink-0"
          aria-hidden
          style={
            {
              "--r": "clamp(124px, 34vw, 200px)",
              "--img": "clamp(148px, 40vw, 240px)",
              width: "calc(2 * var(--r) + var(--img))",
              height: "calc(2 * var(--r) + var(--img))",
            } as React.CSSProperties
          }
        >
          <motion.div className="absolute inset-0" style={{ rotate: angle }}>
            {COLLAGE.map((photo, i) => (
              <div
                key={photo.src}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: "var(--img)",
                  height: "var(--img)",
                  transform: `translate(-50%, -50%) translate(${SLOTS[i]!.x}, ${SLOTS[i]!.y})`,
                }}
              >
                <motion.div
                  className="relative h-full w-full overflow-hidden border shadow-[0_18px_40px_-24px_rgba(23,24,26,0.28)] will-change-transform"
                  style={{ rotate: negAngle, borderColor: "var(--color-border)" }}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 40vw, 240px"
                    draggable={false}
                  />
                </motion.div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
