"use client";

/**
 * SPEC §4 — hero da Andre Watches. Faixa que cresce + scrubbing por scroll.
 *
 * Mecânica (D11):
 *  - A peça aparece dentro de uma faixa cinemascope estreita no centro. O
 *    título fica na margem preta de cima, o subtexto e os CTAs na de baixo —
 *    texto NUNCA se sobrepõe ao vídeo. Isso é requisito, não estética: a
 *    luminância do material alterna entre setups claros e escuros (77% de
 *    pixels claros aos 1s, 12% aos 5s), então copy sobreposta ficaria
 *    ilegível em metade da duração.
 *  - 0 → 45% do scroll: a faixa abre até sangria total e o texto desliza pra
 *    fora pelas margens.
 *  - 0 → 100%: o índice do frame acompanha o scroll o tempo todo. O relógio se
 *    move porque o usuário rola, que é a tese do §4.1.
 *
 * Desktop: canvas 2D + sequência de WebP (mesma técnica do `HeroSequence`, que
 * segue disponível pra uma sequência de take único no futuro). Canvas é
 * confiável; seek de `<video>` por scroll engasga, principalmente no iOS.
 *
 * Mobile: `<video>` nativo em loop, sem scrubbing — o custo de baixar 120
 * frames não se paga em tela pequena.
 *
 * Reduced-motion (§3.4/§9): poster estático, faixa já aberta, texto parado.
 */

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { WhatsappCta } from "@/components/contact/WhatsappCta";

/**
 * 361 frames = os 12s da fonte a 30fps, ou seja, TODOS os quadros do original.
 * É o teto de fluidez possível — não existe quadro intermediário pra buscar.
 * Custo: 16,5 MB na sequência completa, mitigado pela carga progressiva abaixo.
 */
const FRAME_COUNT = 361;
const FRAME_BASE = "/hero-sequence";
const FRAME_PREFIX = "aw-hero";
const POSTER = "/hero-poster.jpg";
const MOBILE_VIDEO = "/hero-mobile.mp4";
/** Poster leve, dimensionado pro mobile — o de desktop tem 1440px. */
const POSTER_MOBILE = "/hero-poster-mobile.jpg";

/**
 * Frames do arranque, carregados em densidade total antes de qualquer outra
 * coisa (~1,6 MB). Com poucos, o começo do scroll cai no fallback de "segurar
 * o quadro anterior", que na tela é indistinguível de FPS baixo.
 */
const EAGER_COUNT = 28;

/**
 * Passadas de densidade progressiva. Com 361 frames, carregar em ordem
 * deixaria a segunda metade do scroll vazia por dezenas de segundos — quem
 * rolasse rápido cairia num buraco enorme.
 *
 * Em vez disso: primeiro um esqueleto ralo cobrindo a sequência INTEIRA (a
 * cada 6º frame ≈ 5fps, 2,8 MB), depois passadas que vão preenchendo os
 * vãos. Assim qualquer posição de scroll sempre tem um frame próximo, e a
 * fluidez cresce com o tempo em vez de a cobertura crescer com a distância.
 */
const DENSITY_PASSES = [6, 3, 2, 1] as const;

/** Downloads simultâneos — o browser dá ~6 por origem. */
const LOAD_CONCURRENCY = 6;
const MOBILE_BREAKPOINT_PX = 768;

/** Altura da margem preta inicial, em % da tela, em cima e embaixo. */
const BAND_MARGIN_PCT = 31;
/** Fração do scroll em que a faixa termina de abrir. */
const BAND_OPEN_AT = 0.45;

/**
 * Inércia da coreografia (D12). O scroll não dirige os frames direto: passa por
 * uma mola, então soltar o dedo desacelera em vez de congelar — pé fora do
 * acelerador, não freio de mão.
 *
 * SUPERAMORTECIDA de propósito. Razão de amortecimento
 * ζ = damping / (2·√(stiffness·mass)) = 20 / (2·√50) ≈ 1.41 > 1, ou seja, chega
 * no alvo sem passar dele. Relógio não quica (CLAUDE.md, regra 6) — se alguém
 * baixar o `damping` abaixo de ~14 isso vira overshoot e quebra a regra.
 *
 * Tempo de acomodação ≈ 0,4s, que é o quanto o movimento "desliza" depois que
 * você para.
 */
const COAST = {
  stiffness: 50,
  damping: 20,
  mass: 1,
  restDelta: 0.0002,
} as const;

function frameUrl(i: number) {
  return `${FRAME_BASE}/${FRAME_PREFIX}-${String(i + 1).padStart(3, "0")}.webp`;
}

export function HeroBand() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Tudo na coreografia lê `progress`, nunca `scrollYProgress` cru — assim
  // frames, faixa e texto desaceleram juntos, sem um "escapar" do outro.
  const progress = useSpring(scrollYProgress, COAST);

  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Carregamento dos frames (desktop, sem reduced-motion) ────────────────
  useEffect(() => {
    if (isMobile || reduce) return;

    let cancelled = false;
    const images: (HTMLImageElement | undefined)[] = new Array(FRAME_COUNT);
    imagesRef.current = images;

    /**
     * `decode()` é o ponto central aqui. Com `onload` a imagem está baixada mas
     * ainda não decodificada, e a decodificação acontece dentro do primeiro
     * `drawImage` — na main thread, no meio do scroll. É isso que produz o
     * engasgo tipo "lag de jogo". Decodificando antes, o draw vira só um blit.
     */
    const load = async (i: number) => {
      const img = new Image();
      img.decoding = "async";
      img.src = frameUrl(i);
      try {
        await img.decode();
      } catch {
        // decode() rejeita em formato não suportado ou erro de rede; cai pro
        // onload pra não travar a fila.
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      if (!cancelled) images[i] = img;
    };

    /** Índice do frame que o scroll está mostrando agora. */
    const currentIndex = () =>
      Math.round(progress.get() * (FRAME_COUNT - 1));

    /**
     * Carrega uma lista de índices em lotes, pulando o que já está em memória.
     *
     * A ordem é recalculada a cada lote pela distância ao frame ATUAL. Sem
     * isso, quem rola até o fim fica esperando o carregamento chegar lá pela
     * ordem — que era a causa do travamento no fim da sequência. Agora o
     * download persegue o usuário.
     */
    const loadBatch = async (indices: number[]) => {
      const pending = new Set(indices.filter((i) => !images[i]));
      while (pending.size > 0) {
        if (cancelled) return;
        const here = currentIndex();
        const next = [...pending]
          .sort((a, b) => Math.abs(a - here) - Math.abs(b - here))
          .slice(0, LOAD_CONCURRENCY);
        next.forEach((i) => pending.delete(i));
        await Promise.all(next.map(load));
      }
    };

    (async () => {
      // 1. Arranque: densidade total no trecho que o usuário vê primeiro.
      await loadBatch(Array.from({ length: EAGER_COUNT }, (_, i) => i));
      if (cancelled) return;
      setReady(true);

      // 2. Esqueleto e refinamentos: cada passada dobra a densidade sobre a
      //    sequência inteira, então nunca existe um trecho descoberto.
      for (const step of DENSITY_PASSES) {
        if (cancelled) return;
        const indices: number[] = [];
        for (let i = 0; i < FRAME_COUNT; i += step) indices.push(i);
        await loadBatch(indices);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMobile, reduce]);

  // ── Canvas: dimensiona e desenha o frame do scroll atual ─────────────────
  useEffect(() => {
    if (isMobile || reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastIndex = -1;
    let rafId = 0;

    // `alpha: false` deixa o compositor pular a mistura: o frame é opaco e
    // cobre o canvas inteiro. Contexto cacheado — pegar a cada quadro é
    // trabalho jogado fora.
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const paint = (force: boolean) => {

      const idx = Math.min(
        FRAME_COUNT - 1,
        Math.max(0, Math.round(progress.get() * (FRAME_COUNT - 1))),
      );
      // A mola emite muito mais tiques do que existem frames: sem esta guarda,
      // vários deles redesenhavam a tela inteira com a MESMA imagem.
      if (idx === lastIndex && !force) return;

      // Se o frame exato ainda não chegou, segura o anterior mais próximo —
      // melhor do que piscar preto.
      let img = imagesRef.current[idx];
      for (let k = idx; k >= 0 && !img; k--) img = imagesRef.current[k];
      if (!img) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      lastIndex = idx;
    };

    // Um draw por quadro de tela, no máximo. Sem isso, uma rajada de tiques da
    // mola vira uma rajada de drawImage dentro do mesmo quadro — trabalho
    // jogado fora que rouba o orçamento de 16ms.
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        paint(false);
      });
    };

    const resize = () => {
      // DPR capado em 1.5: o material tem 1440px de largura, então backing
      // store em 2x só faz o browser escalar mais pixels do que existem na
      // fonte. 1.5 mantém a nitidez e corta ~44% da área de desenho.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      paint(true);
    };

    resize();
    window.addEventListener("resize", resize);
    const unsub = progress.on("change", schedule);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
      unsub();
    };
  }, [isMobile, reduce, progress, ready]);

  // ── Coreografia ──────────────────────────────────────────────────────────
  /**
   * A faixa abre por TRANSFORM, não por `clip-path`.
   *
   * A versão com `inset()` animado repintava a camada recortada a cada quadro,
   * e isso rodava justamente entre 0 e 45% do scroll — ou seja, exatamente o
   * "travamento no início". Duas barras sólidas na cor de fundo, deslizando
   * pra fora, dão o mesmo resultado visual usando só `translateY`: composição
   * pura na GPU, sem repaint do canvas.
   */
  const barOut: [number, number] = [0, BAND_OPEN_AT];
  const topBarY = useTransform(progress, barOut, ["0%", "-100%"], { clamp: true });
  const bottomBarY = useTransform(progress, barOut, ["0%", "100%"], { clamp: true });

  // Texto sai um pouco à frente da barra — dá profundidade e some antes de a
  // borda da barra passar por cima dele.
  const textOut: [number, number] = [0, BAND_OPEN_AT * 0.8];
  const textLead = useTransform(progress, textOut, ["0%", "-22%"]);
  const textLeadDown = useTransform(progress, textOut, ["0%", "22%"]);
  const textOpacity = useTransform(progress, [0, BAND_OPEN_AT * 0.7], [1, 0]);
  const indicatorOpacity = useTransform(progress, [0, 0.05], [1, 0]);

  return (
    <section
      ref={containerRef}
      aria-label="Andre Watches — relógios de luxo"
      className="relative"
      style={{ height: reduce ? "100vh" : "250vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Faixa: cresce do cinemascope até a sangria total */}
        <div className="absolute inset-0">
          {reduce || isMobile ? (
            isMobile && !reduce ? (
              <video
                className="h-full w-full object-cover"
                poster={POSTER_MOBILE}
                src={MOBILE_VIDEO}
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={POSTER}
                alt="Relógio de luxo em detalhe macro"
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              />
              {!ready && (
                <div
                  aria-hidden
                  className="absolute inset-0 animate-pulse"
                  style={{ background: "var(--color-surface)" }}
                />
              )}
            </>
          )}

          {/* Vinheta — costura a faixa no preto do site */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(125% 105% at 50% 48%, transparent 62%, rgba(23,24,26,0.22) 100%)",
            }}
          />
        </div>

        {/* Barra de cima — cobre o vídeo e desliza pra fora levando o título */}
        <motion.div
          className="absolute inset-x-0 top-0 flex items-end px-6 pb-8 will-change-transform md:px-16 md:pb-10"
          style={{
            height: `${BAND_MARGIN_PCT}%`,
            background: "var(--color-background)",
            ...(reduce ? {} : { y: topBarY }),
          }}
        >
          <motion.div
            className="mx-auto w-full max-w-6xl"
            style={reduce ? undefined : { y: textLead, opacity: textOpacity }}
          >
            <p className="eyebrow mb-4">Relógios de luxo · desde 2012</p>
            <h1
              className="text-balance"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.25rem, 7vw, 6rem)",
                lineHeight: 0.94,
                letterSpacing: "-0.03em",
              }}
            >
              Andre Watches
            </h1>
          </motion.div>
        </motion.div>

        {/* Barra de baixo — subtexto e CTAs */}
        <motion.div
          className="absolute inset-x-0 bottom-0 flex items-start px-6 pt-8 will-change-transform md:px-16 md:pt-10"
          style={{
            height: `${BAND_MARGIN_PCT}%`,
            background: "var(--color-background)",
            ...(reduce ? {} : { y: bottomBarY }),
          }}
        >
          <motion.div
            className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between"
            style={reduce ? undefined : { y: textLeadDown, opacity: textOpacity }}
          >
            <p
              className="max-w-md text-base leading-relaxed md:text-lg"
              style={{ color: "var(--color-muted)" }}
            >
              Rolex e outras maisons premium, conferidas peça a peça antes de
              entrarem na vitrine.
            </p>

            <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/colecao"
                className="btn btn-primary group"
              >
                Ver acervo
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>

              <WhatsappCta
                variant="secondary"
                label="Vender ou trocar"
                context="Vim pelo site e quero vender ou trocar um relógio."
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Indicador de scroll */}
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 md:block"
            style={{ opacity: indicatorOpacity }}
          >
            <span
              className="animate-hero-scroll-pulse block h-8 w-px"
              style={{ background: "var(--color-accent)" }}
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
