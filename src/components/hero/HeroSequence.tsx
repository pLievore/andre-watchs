"use client";

/**
 * SPEC §4 — Hero scroll-driven sequence scrubbing.
 *
 * Desvio do §4.1 (iteração UX 2026-05-18): a copy principal (H1 + subhead +
 * CTAs) fica visível desde o scroll=0, e os value-props aparecem em stagger
 * durante a fase 1 da rotação. O texto não espera mais a fase 2 — usuário
 * sem scroll precisa entender que é uma loja, não uma página estática.
 *
 * Pipeline visual:
 *   0.00 → 0.04  scroll indicator some
 *   0.00 → 0.50  fase 1: canvas roda 360° (frame 0 → frameCount-1)
 *   0.10 → 0.46  value-props revelam em stagger (one a cada ~12% de scroll)
 *   0.50 → 1.00  fase 2: canvas escala 1.0 → 1.4 + y -60, sem alterar texto
 */

import {
  type MotionValue,
  animate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type Cta = { label: string; href: string };

interface HeroSequenceProps {
  framesBasePath: string;
  frameCount: number;
  mobileFrameCount: number;
  frameExtension: string;
  framePrefix: string;
  headline: string;
  subhead: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  /** Stagger reveals durante fase 1. 3 itens = stagger ótimo; mais que 4 polui. */
  valueProps: readonly string[];
  /**
   * Números de arquivo (1-based) a omitir da sequência. Usado pra excisar
   * trechos de jitter do Veo 3 (rotação que "vai e volta" sem progresso
   * líquido). Os frames vizinhos do corte devem estar no mesmo ângulo —
   * ver scripts/scan-angle-match.mjs.
   */
  skipFrames?: readonly number[];
}

const EAGER_LOAD_COUNT = 12;
const FALLBACK_FRAME_INDEX = 17; // SPEC §4.4 — "frame 18 estático" (zero-indexed)
const MOBILE_BREAKPOINT_PX = 768;

const VALUE_PROP_START = 0.1;
const VALUE_PROP_STEP = 0.12;
const VALUE_PROP_FADE_LEN = 0.06;

function buildFrameUrl(
  base: string,
  prefix: string,
  oneBasedIndex: number,
  ext: string,
) {
  return `${base}/${prefix}-${String(oneBasedIndex).padStart(3, "0")}.${ext}`;
}

function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  return conn.effectiveType === "2g" || conn.effectiveType === "slow-2g";
}

function requestIdle(cb: () => void): number {
  if (typeof window === "undefined") return 0;
  const ric = (
    window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    }
  ).requestIdleCallback;
  if (ric) return ric(cb);
  return window.setTimeout(cb, 200);
}

/**
 * Sub-componente isolado pra cada value-prop. Existe porque `useTransform`
 * não pode ser chamado dentro de um loop no componente pai (rules of hooks),
 * e cada item precisa do seu próprio par opacity/y baseado no `at`.
 */
function ValueProp({
  progress,
  at,
  label,
  staticReveal,
}: {
  progress: MotionValue<number>;
  at: number;
  label: string;
  staticReveal: boolean;
}) {
  const opacity = useTransform(
    progress,
    [at, at + VALUE_PROP_FADE_LEN],
    staticReveal ? [1, 1] : [0, 1],
  );
  const y = useTransform(
    progress,
    [at, at + VALUE_PROP_FADE_LEN],
    staticReveal ? [0, 0] : [12, 0],
  );

  return (
    <motion.li
      className="flex items-center gap-3 text-xs uppercase tracking-[0.18em]"
      style={{
        opacity,
        y,
        color: "var(--color-muted)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span
        aria-hidden
        className="inline-block h-px w-6"
        style={{ background: "var(--color-accent)" }}
      />
      {label}
    </motion.li>
  );
}

export function HeroSequence({
  framesBasePath,
  frameCount,
  mobileFrameCount,
  frameExtension,
  framePrefix,
  headline,
  subhead,
  primaryCta,
  secondaryCta,
  valueProps,
  skipFrames,
}: HeroSequenceProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef<number>(0);

  const [isMobile, setIsMobile] = useState(false);
  const [isStaticFallback, setIsStaticFallback] = useState(false);
  const [eagerFramesLoaded, setEagerFramesLoaded] = useState(false);

  // MotionValue 0→0.5 conduzido por RAF no mobile (espelha a fase 1 do scroll no desktop).
  const autoProgressMV = useMotionValue(0);

  const reducedMotion = useReducedMotion();

  // Lista ordenada de números de arquivo (1-based), já sem os skipFrames.
  // O índice do array é o "frame lógico"; o valor é qual webp carregar.
  const frameFileNumbers = useMemo(() => {
    const skip = new Set(skipFrames ?? []);

    // Sequência completa (desktop): todos os frames menos os pulados.
    const full: number[] = [];
    for (let n = 1; n <= frameCount; n++) {
      if (!skip.has(n)) full.push(n);
    }

    if (!isMobile || mobileFrameCount >= full.length || mobileFrameCount <= 1) {
      return full;
    }

    // Mobile: downsample UNIFORME ao longo da rotação inteira. Antes pegava
    // os primeiros N arquivos (= só meia volta, rotação incompleta). Agora
    // distribui mobileFrameCount amostras de 0 a full.length-1, cobrindo os
    // 360° completos com menos densidade de frame (SPEC §4.2).
    const sampled: number[] = [];
    for (let i = 0; i < mobileFrameCount; i++) {
      const idx = Math.round((i * (full.length - 1)) / (mobileFrameCount - 1));
      sampled.push(full[idx]!);
    }
    // remove duplicatas consecutivas (caso mobileFrameCount fique perto de full)
    return sampled.filter((v, i) => i === 0 || v !== sampled[i - 1]);
  }, [isMobile, mobileFrameCount, frameCount, skipFrames]);

  const effectiveFrameCount = frameFileNumbers.length;

  // Índice lógico do frame de fallback estático (§4.4). Aponta pro arquivo
  // FALLBACK_FRAME_INDEX+1 se ele não tiver sido pulado; senão usa o do meio.
  const fallbackLogicalIndex = useMemo(() => {
    const target = FALLBACK_FRAME_INDEX + 1;
    const idx = frameFileNumbers.indexOf(target);
    return idx >= 0 ? idx : Math.floor(frameFileNumbers.length / 2);
  }, [frameFileNumbers]);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const updateMobile = () => setIsMobile(mq.matches);
    updateMobile();
    mq.addEventListener("change", updateMobile);

    if (isSlowConnection() || reducedMotion) {
      setIsStaticFallback(true);
    }

    return () => mq.removeEventListener("change", updateMobile);
  }, [reducedMotion]);

  useEffect(() => {
    if (isStaticFallback) {
      const fallback = new Image();
      fallback.src = buildFrameUrl(
        framesBasePath,
        framePrefix,
        frameFileNumbers[fallbackLogicalIndex] ?? FALLBACK_FRAME_INDEX + 1,
        frameExtension,
      );
      fallback.onload = () => {
        imagesRef.current[fallbackLogicalIndex] = fallback;
        setEagerFramesLoaded(true);
        drawFrame(fallbackLogicalIndex);
      };
      return;
    }

    // Reseta para mostrar skeleton enquanto os novos frames carregam
    // (necessário quando isMobile muda e effectiveFrameCount é diferente).
    setEagerFramesLoaded(false);
    imagesRef.current = new Array(effectiveFrameCount);
    let loadedEager = 0;
    let cancelled = false;

    const loadOne = (i: number, eager: boolean) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.src = buildFrameUrl(
          framesBasePath,
          framePrefix,
          frameFileNumbers[i] ?? i + 1,
          frameExtension,
        );
        img.onload = () => {
          if (cancelled) return resolve();
          imagesRef.current[i] = img;
          if (eager) {
            loadedEager += 1;
            if (loadedEager === Math.min(EAGER_LOAD_COUNT, effectiveFrameCount)) {
              setEagerFramesLoaded(true);
              drawFrame(0);
            }
          }
          resolve();
        };
        img.onerror = () => resolve();
      });

    const eagerEnd = Math.min(EAGER_LOAD_COUNT, effectiveFrameCount);
    for (let i = 0; i < eagerEnd; i++) loadOne(i, true);

    const idleId = requestIdle(() => {
      for (let i = eagerEnd; i < effectiveFrameCount; i++) loadOne(i, false);
    });

    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        const cancelIdle = (
          window as Window & {
            cancelIdleCallback?: (id: number) => void;
          }
        ).cancelIdleCallback;
        if (cancelIdle) cancelIdle(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, [
    effectiveFrameCount,
    frameFileNumbers,
    fallbackLogicalIndex,
    framesBasePath,
    framePrefix,
    frameExtension,
    isStaticFallback,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      drawFrame(currentFrameRef.current);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eagerFramesLoaded]);

  function drawFrame(index: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imagesRef.current[index];
    if (!img) return;

    currentFrameRef.current = index;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!iw || !ih) return;

    // Cover-fit: preserve aspect, center, crop overflow.
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const frameProgress = useTransform(
    scrollYProgress,
    [0, 0.5],
    [0, effectiveFrameCount - 1],
  );

  const phase2Active = !(isMobile || isStaticFallback);

  const canvasScale = useTransform(
    scrollYProgress,
    [0.5, 1],
    phase2Active ? [1, 1.4] : [1, 1],
  );
  const canvasY = useTransform(
    scrollYProgress,
    [0.5, 1],
    phase2Active ? [0, -60] : [0, 0],
  );

  const scrollIndicatorOpacity = useTransform(
    scrollYProgress,
    [0, 0.04],
    [1, 0],
  );

  useMotionValueEvent(frameProgress, "change", (latest) => {
    // No mobile o avanço de frame é gerido pelo RAF de autoplay.
    if (isStaticFallback || isMobile) return;
    const idx = Math.max(
      0,
      Math.min(effectiveFrameCount - 1, Math.round(latest)),
    );
    drawFrame(idx);
  });

  // ── Mobile: vídeo boomerang em loop nativo ─────────────────────────────────
  // O arquivo já contém forward+reverso concatenados (palíndromo), então o
  // playback nativo (autoPlay/loop) faz o ping-pong SEM seeking reverso — que
  // era a causa do "lag" de fps na volta. Nativo = sempre suave, casa nas
  // pontas. Aqui só revelamos os value-props uma vez (animate 0→0.55 no mount).
  useEffect(() => {
    if (!isMobile || isStaticFallback) return;
    const controls = animate(autoProgressMV, 0.55, {
      duration: 2.4,
      delay: 0.3,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, isStaticFallback]);

  // Entrada cinematográfica da copy (item 02): cascata lenta com leve atraso
  // antes da 1ª palavra. No-op sob reduced-motion ou fallback estático.
  const heroReveal = (delay: number) =>
    reducedMotion || isStaticFallback
      ? undefined
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: {
            duration: 0.95,
            delay,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          },
        };

  const initialFrameUrl = buildFrameUrl(
    framesBasePath,
    framePrefix,
    isStaticFallback
      ? (frameFileNumbers[fallbackLogicalIndex] ?? FALLBACK_FRAME_INDEX + 1)
      : (frameFileNumbers[0] ?? 1),
    frameExtension,
  );

  return (
    <section
      ref={containerRef}
      aria-label="Andre Watches — destaque do acervo"
      className="relative"
      style={{ height: isStaticFallback || isMobile ? "100vh" : "200vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Canvas layer — desktop only; mobile usa <video> abaixo */}
        <motion.div
          className="absolute inset-0 hidden md:block"
          style={{ scale: canvasScale, y: canvasY }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          />
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={initialFrameUrl}
              alt="Relógio em destaque no acervo da Andre Watches"
              className="h-full w-full object-cover"
            />
          </noscript>
          {!eagerFramesLoaded && (
            <div
              className="absolute inset-0 animate-pulse"
              style={{ background: "var(--color-surface)" }}
              aria-hidden="true"
            />
          )}
        </motion.div>

        {/* Mobile hero — vídeo boomerang em loop nativo (ping-pong sem seeking) */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover block md:hidden"
          autoPlay
          loop
          muted
          playsInline
          src="/hero-mobile-boomerang.mp4"
          aria-hidden="true"
        />

        {/* Vignette lateral */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(8,9,10,0.55) 100%)",
          }}
        />

        {/* Gradiente superior — legibilidade do header */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0"
          style={{
            height: "28%",
            background:
              "linear-gradient(to bottom, rgba(8,9,10,0.82) 0%, transparent 100%)",
          }}
        />

        {/* Gradiente inferior — scrim forte pra copy clara ficar legível sobre o vídeo claro */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            height: "80%",
            background:
              "linear-gradient(to top, rgba(8,9,10,0.97) 0%, rgba(8,9,10,0.88) 38%, rgba(8,9,10,0.5) 68%, transparent 100%)",
          }}
        />

        {/* Copy principal — visível desde o scroll=0 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-16 md:px-16 md:pb-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-6">
              <motion.h1
                {...heroReveal(0.35)}
                className="pointer-events-auto max-w-3xl text-balance"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.75rem, 9vw, 8rem)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                  color: "var(--color-foreground)",
                  textShadow: "0 2px 40px rgba(8,9,10,0.95)",
                }}
              >
                {headline}
              </motion.h1>
              <motion.p
                {...heroReveal(0.6)}
                className="pointer-events-auto max-w-md text-base md:text-lg"
                style={{
                  color: "var(--color-foreground)",
                  textShadow: "0 1px 16px rgba(8,9,10,0.9)",
                }}
              >
                {subhead}
              </motion.p>
              <motion.div
                {...heroReveal(0.8)}
                className="pointer-events-auto flex flex-wrap items-center gap-6"
              >
                <Link
                  href={primaryCta.href}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium uppercase tracking-widest transition-colors"
                  style={{
                    background: "var(--color-foreground)",
                    color: "var(--color-background)",
                    transitionDuration: "200ms",
                    transitionTimingFunction: "var(--ease-editorial)",
                  }}
                >
                  {primaryCta.label}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href={secondaryCta.href}
                  className="text-sm uppercase tracking-widest underline-offset-8 hover:underline"
                  style={{ color: "var(--color-foreground)" }}
                >
                  {secondaryCta.label}
                </Link>
              </motion.div>
            </div>

            {/* Value-props com stagger durante fase 1 */}
            {valueProps.length > 0 && (
              <ul className="pointer-events-auto flex flex-col gap-3 md:items-end">
                {valueProps.map((label, i) => (
                  <ValueProp
                    key={label}
                    label={label}
                    at={VALUE_PROP_START + i * VALUE_PROP_STEP}
                    progress={isMobile ? autoProgressMV : scrollYProgress}
                    staticReveal={isStaticFallback}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Scroll indicator — só no desktop; no mobile o hero auto-reproduz */}
        {!isStaticFallback && !isMobile && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center"
            style={{ opacity: scrollIndicatorOpacity }}
            aria-hidden
          >
            <div className="flex flex-col items-center gap-2">
              <span
                className="text-[10px] uppercase tracking-[0.4em]"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-muted)",
                }}
              >
                role para explorar
              </span>
              <span
                className="block h-8 w-px animate-hero-scroll-pulse"
                style={{ background: "var(--color-muted)" }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
