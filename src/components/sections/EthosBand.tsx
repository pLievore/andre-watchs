"use client";

/**
 * Faixa de princípios (SPEC §1.3) — carrossel vertical-pinned.
 *
 * A seção "trava" (sticky) por N telas de scroll. Cada card+frase entra DA
 * DIREITA, fica em destaque no centro, e SAI PELA ESQUERDA conforme o scroll
 * avança — um de cada vez, "girado" pelo scroll. O último segura no centro
 * até a seção liberar.
 *
 * Desktop e mobile usam o mesmo mecanismo (scroll dirige tudo). Reduced-motion
 * (§3.4/§10) cai num stack estático simples.
 */

import {
  cubicBezier,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import { useRef } from "react";

const SCROLL_PER_CARD_VH = 95; // altura de scroll por card

// Easing natural: desacelera ao chegar (entrada), acelera ao sair (saída).
const EASE_APPROACH = cubicBezier(0.22, 1, 0.36, 1); // expo.out — chega suave
const EASE_RECEDE = cubicBezier(0.5, 0, 0.75, 0); // cubic.in — some rápido

/**
 * SPEC §1.3 — os três pilares. Copy conferida contra §1.4: nada aqui afirma
 * revenda autorizada nem "autenticidade garantida" sem dizer COMO.
 */
const PILLARS = [
  {
    n: "01",
    title: "Somente originais",
    body: "Cada peça passa por conferência de procedência antes de entrar no acervo: número de série, calibre, acabamento de fábrica e o que acompanha. Réplica e homage não entram aqui.",
    image: {
      src: "/pecas/ethos-procedencia.webp",
      alt: "Relojoeiro com lupa e pinça examinando o movimento de um relógio na bancada",
    },
  },
  {
    n: "02",
    title: "Desde 2012 na mesma mesa",
    body: "Mais de uma década comprando, vendendo, trocando e recebendo peças em consignação. O acervo é pequeno de propósito — a casa só anuncia o que conhece.",
    image: {
      src: "/pecas/ethos-casa.webp",
      alt: "Mãos apresentando um relógio sobre a caixa, em luz baixa",
    },
  },
  {
    n: "03",
    title: "Estado descrito por inteiro",
    body: "Marcas de uso são fotografadas e escritas, não escondidas. Você sabe exatamente o que vai receber antes de qualquer transferência.",
    image: {
      src: "/pecas/ethos-estado.webp",
      alt: "Mãos abrindo um relógio de ouro rosé com ferramenta, examinando o interior da caixa",
    },
  },
] as const;

type Pillar = (typeof PILLARS)[number];

function SlideContent({ pillar }: { pillar: Pillar }) {
  return (
    <div className="mx-auto grid w-full max-w-5xl items-center gap-8 md:grid-cols-2 md:gap-16">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden border"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Image
          src={pillar.image.src}
          alt={pillar.image.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 90vw, 45vw"
          draggable={false}
        />
      </div>
      <div className="flex flex-col gap-5">
        <span
          className="meta"
          style={{ fontFamily: "var(--font-mono)", color: "var(--color-accent)" }}
        >
          {pillar.n} / {String(PILLARS.length).padStart(2, "0")}
        </span>
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.25rem, 5vw, 4rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.02em",
          }}
        >
          {pillar.title}
        </h3>
        <p
          className="max-w-md text-base leading-relaxed md:text-lg"
          style={{ color: "var(--color-muted)" }}
        >
          {pillar.body}
        </p>
      </div>
    </div>
  );
}

function PillarSlide({
  pillar,
  i,
  total,
  progress,
}: {
  pillar: Pillar;
  i: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const seg = 1 / total;
  const center = (i + 0.5) * seg;
  // Span > seg/2 garante overlap entre vizinhos (crossfade, sem flash de vazio).
  const span = seg * 0.7;
  const a = center - span;
  const b = center;
  const c = center + span;
  const isLast = i === total - 1;

  // Profundidade + viagem horizontal exagerada:
  //  - vem pequeno e LÁ DA DIREITA (x +90%, scale 0.28) crescendo,
  //  - chega em foco no CENTRO (x 0, scale 1),
  //  - sai ENCOLHENDO pela ESQUERDA (x -90%, scale 0.28).
  // Easing: chega desacelerando (expo.out), some acelerando (cubic.in).
  const easeOpts = { ease: [EASE_APPROACH, EASE_RECEDE] };

  const x = useTransform(progress, [a, b, c], ["90%", "0%", isLast ? "0%" : "-90%"], easeOpts);
  const scale = useTransform(progress, [a, b, c], [0.28, 1, isLast ? 1 : 0.28], easeOpts);
  // Tilt sutil pra dar "voo" ao movimento.
  const rotate = useTransform(progress, [a, b, c], [6, 0, isLast ? 0 : -6], easeOpts);
  const opacity = useTransform(progress, [a, b, c], [0, 1, isLast ? 1 : 0], easeOpts);

  return (
    <motion.div
      style={{ x, scale, rotate, opacity }}
      className="absolute inset-0 flex items-center justify-center px-6 will-change-transform md:px-16"
    >
      <SlideContent pillar={pillar} />
    </motion.div>
  );
}

export function EthosBand() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Reduced-motion: stack estático, sem pin nem animação.
  if (reduce) {
    return (
      <section
        className="border-t"
        style={{ borderColor: "var(--color-border)" }}
        aria-labelledby="ethos-title"
      >
        <h2 id="ethos-title" className="sr-only">
          Por que a Andre Watches
        </h2>
        <div className="mx-auto flex max-w-5xl flex-col gap-20 px-6 py-24 md:px-16">
          {PILLARS.map((p) => (
            <SlideContent key={p.n} pillar={p} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative border-t"
      style={{
        borderColor: "var(--color-border)",
        height: `${PILLARS.length * SCROLL_PER_CARD_VH}vh`,
      }}
      aria-labelledby="ethos-title"
    >
      <h2 id="ethos-title" className="sr-only">
        Por que a Andre Watches
      </h2>
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Pista de progresso (1/2/3) */}
        <div className="pointer-events-none absolute left-1/2 top-[18%] z-10 flex -translate-x-1/2 gap-2 md:left-16 md:translate-x-0">
          {PILLARS.map((p, idx) => (
            <ProgressTick key={p.n} idx={idx} total={PILLARS.length} progress={scrollYProgress} />
          ))}
        </div>

        <div className="relative h-full">
          {PILLARS.map((p, idx) => (
            <PillarSlide
              key={p.n}
              pillar={p}
              i={idx}
              total={PILLARS.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgressTick({
  idx,
  total,
  progress,
}: {
  idx: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const seg = 1 / total;
  const center = (idx + 0.5) * seg;
  const opacity = useTransform(
    progress,
    [center - seg / 2, center, center + seg / 2],
    [0.3, 1, 0.3],
  );
  const scaleX = useTransform(
    progress,
    [center - seg / 2, center, center + seg / 2],
    [1, 2.4, 1],
  );
  return (
    <motion.span
      className="block h-px w-6 origin-left"
      style={{ opacity, scaleX, background: "var(--color-accent)" }}
    />
  );
}
