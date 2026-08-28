"use client";

/**
 * SPEC §5 — vitrine (abaixo do hero).
 *
 * Comportamento (SPEC §5.1):
 *  - Desktop (md+): seção "pinned" (sticky) onde o trilho de cards desliza
 *    horizontalmente conforme o scroll vertical avança.
 *  - Mobile (< md): scroll horizontal nativo com snap (swipe natural no touch).
 *
 * Separação feita via CSS puro (md: breakpoint) — sem detecção JS, sem flash,
 * sem iOS scroll-locking causado pelo SSR do layout desktop.
 */

import { animate, motion, useMotionValue, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { WatchCard } from "@/components/watch/WatchCard";
import type { Watch } from "@/lib/types";

interface WatchShowcaseProps {
  /**
   * As peças vêm por prop, do Server Component que consultou o banco. Assim
   * este componente segue client (precisa de scroll e animação) sem arrastar
   * acesso a dados para o navegador.
   */
  watches: readonly Watch[];
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}

export function WatchShowcase({
  watches,
  eyebrow = "No cofre agora",
  title,
  viewAllHref = "/acervo",
  viewAllLabel = "Ver toda a coleção",
}: WatchShowcaseProps) {

  // sectionRef apenas no layout desktop — sempre montado em md+.
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Mobile marquee refs
  const mobileTrackRef = useRef<HTMLUListElement | null>(null);
  const mobileX = useMotionValue(0);
  const [maxScroll, setMaxScroll] = useState(0);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const overflow = track.scrollWidth - window.innerWidth + 96;
      setMaxScroll(Math.max(0, overflow));
    };
    measure();
    window.addEventListener("resize", measure);
    const t = window.setTimeout(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearTimeout(t);
    };
  }, [watches.length]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // ── Mobile: marquee infinito (Motion animate) ─────────────────────────────────
  // Usa `animate` do Motion em vez de scrollLeft (confiável em iOS/Android).
  // Dois conjuntos de peças no DOM garantem loop visualmente contínuo.
  useEffect(() => {
    const ul = mobileTrackRef.current;
    if (!ul || ul.children.length === 0) return;
    const firstItem = ul.children[0] as HTMLElement;
    const secondItem = ul.children[1] as HTMLElement;
    if (!firstItem || !secondItem) return;
    const cardWidth = firstItem.getBoundingClientRect().width;
    if (cardWidth === 0) return; // hidden (desktop)
    const gap =
      secondItem.getBoundingClientRect().left -
      firstItem.getBoundingClientRect().right;
    // Distância exata de um conjunto: N×card + N×gap (inclui o gap entre os dois conjuntos)
    const setWidth = watches.length * (cardWidth + gap);
    const controls = animate(mobileX, [0, -setWidth], {
      duration: 40,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    });
    return () => controls.stop();
  }, [mobileX, watches.length]);
  const x = useTransform(scrollYProgress, [0, 1], [0, -maxScroll]);
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0.04, 1]);

  const ViewAllCard = (
    <Link
      href={viewAllHref}
      className="group flex aspect-[4/5] w-[18rem] shrink-0 flex-col items-center justify-center gap-5 border transition-colors md:w-[23rem]"
      style={{ borderColor: "var(--color-border)" }}
    >
      <span
        className="label"
      >
        Acervo completo
      </span>
      <span
        className="flex items-center gap-3 text-2xl transition-transform duration-300 group-hover:translate-x-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--color-foreground)" }}
      >
        Ver tudo
        <span aria-hidden style={{ color: "var(--color-accent)" }}>
          →
        </span>
      </span>
    </Link>
  );

  return (
    <>
      {/* ── MOBILE (< md) ─────────────────────────────────────────────────────
          Marquee infinito — Motion animate no ul duplicado.              */}
      <section className="py-20 md:hidden" aria-label={title}>
        <div className="mb-8 px-6 flex items-end justify-between gap-4">
          <div>
            <p
              className="label"
            >
              {eyebrow}
            </p>
            <h2
              className="mt-3 text-balance"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.875rem, 8vw, 2.75rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
          </div>
          <Link
            href={viewAllHref}
            className="shrink-0 label flex items-center gap-2"
          >
            Ver tudo
            <span aria-hidden style={{ color: "var(--color-accent)" }}>→</span>
          </Link>
        </div>

        {/* Container overflow-hidden + padding-left para offset inicial */}
        <div className="w-full overflow-hidden pl-6">
          <motion.ul
            ref={mobileTrackRef}
            style={{ x: mobileX }}
            className="flex gap-4"
          >
            {[...watches, ...watches].map((watch, i) => (
              <li key={`${watch.slug}-${i}`} style={{ flexShrink: 0 }}>
                <WatchCard watch={watch} />
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ── DESKTOP (md+) ─────────────────────────────────────────────────────
          Galeria horizontal dirigida por scroll (pinned).
          display:none em mobile → sectionRef nunca fica visível no mobile,
          useScroll não interfere com o scroll nativo.                       */}
      <section
        ref={sectionRef}
        aria-labelledby="collection-title"
        className="relative hidden md:block"
        style={{ height: `calc(100vh + ${maxScroll}px)` }}
      >
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-16">
            <div className="mb-10 flex items-end justify-between gap-6">
              <div>
                <p
                  className="label"
                >
                  {eyebrow}
                </p>
                <h2
                  id="collection-title"
                  className="mt-4 text-balance"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem, 5vw, 3.75rem)",
                    lineHeight: 1.02,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {title}
                </h2>
              </div>
              <Link
                href={viewAllHref}
                className="group hidden shrink-0 items-center gap-2 whitespace-nowrap label md:inline-flex"
              >
                <span className="underline-offset-8 group-hover:underline">{viewAllLabel}</span>
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>

          <motion.div
            ref={trackRef}
            style={{ x }}
            className="flex gap-8 px-16 will-change-transform"
          >
            {watches.map((watch) => (
              <WatchCard key={watch.slug} watch={watch} />
            ))}
            {ViewAllCard}
          </motion.div>

          <div className="mx-auto mt-12 w-full max-w-7xl px-16">
            <div className="h-px w-full origin-left" style={{ background: "var(--color-border)" }}>
              <motion.div
                className="h-px origin-left"
                style={{ background: "var(--color-accent)", scaleX: progressScaleX }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
