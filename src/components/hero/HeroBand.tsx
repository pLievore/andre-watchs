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
 * Desktop: canvas 2D + sequência de WebP. Canvas é confiável; seek de `<video>`
 * por scroll engasga, principalmente no iOS.
 *
 * Mobile: `<video>` nativo em loop, sem scrubbing — 361 frames a 1920px não se
 * pagam em tela pequena, e 361 bitmaps decodificados estouram a memória de um
 * telefone. Uma sequência própria de mobile é possível; ver notas no SPEC.
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
import { LUMA_DESKTOP, LUMA_MOBILE } from "@/lib/hero-luma";

/**
 * Duas sequências: a mesma coreografia, fontes diferentes.
 *
 * O desktop roda os 12s da fonte a 30fps — todos os quadros do original, teto
 * de fluidez. O telefone roda 15fps a 1290px, porque o limite lá não é banda, é
 * MEMÓRIA: cada bitmap decodificado ocupa largura × altura × 4 bytes, e 361
 * quadros a 1920px passariam de 3 GB.
 *
 * 1290 não é arbitrário: é 430pt × DPR 3, a largura em pixels reais do maior
 * iPhone. Qualquer aparelho atual recebe a fonte 1:1, sem ampliação. A primeira
 * versão usava 900px e ficou visivelmente mole — celular de DPR 3 pede bem mais
 * pixel do que a conta em pontos sugere.
 */
const SOURCES = {
  desktop: {
    count: 361,
    width: 1920,
    dir: "/hero-sequence",
    prefix: "aw-hero",
  },
  mobile: {
    count: 181,
    width: 1290,
    dir: "/hero-sequence-mobile",
    prefix: "aw-m",
  },
} as const;

type Source = (typeof SOURCES)[keyof typeof SOURCES];

/** Primeiro quadro estático — é o que o reduced-motion mostra no lugar da sequência. */
const POSTER = "/hero-poster.jpg";
const POSTER_MOBILE = "/hero-poster-mobile.jpg";

function frameUrl(source: Source, i: number) {
  return `${source.dir}/${source.prefix}-${String(i + 1).padStart(3, "0")}.webp`;
}

/**
 * Janela deslizante do mobile: quantos quadros ficam em memória à frente e
 * atrás do atual. É a peça que torna o scrubbing viável no telefone — sem ela,
 * 181 bitmaps a 900px somam 330 MB e o iOS Safari mata a aba. Com a janela, o
 * teto é fixo em ~54 MB por mais longa que a sequência seja.
 *
 * Assimétrica porque o scroll costuma seguir adiante: vale mais ter quadro
 * pronto na direção do movimento do que atrás.
 *
 * Encolheu quando a fonte subiu de 900 para 1290px — o bitmap passou de 1,7 MB
 * para 3,6 MB, então a mesma janela custaria o dobro. A folga conta dos DOIS
 * lados, então o total vivo é AHEAD + BEHIND + 2·SLACK + 1 = 25 quadros, ou
 * ~89 MB. Mexer em qualquer um dos três move esse teto.
 */
const WINDOW_AHEAD = 12;
const WINDOW_BEHIND = 6;
/** Folga antes de descartar, pra vaivém curto não provocar recarga. */
const WINDOW_SLACK = 3;

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

/**
 * SCRIM ADAPTATIVO.
 *
 * O sombreamento não tem opacidade fixa: ele lê a luminância da metade
 * inferior do quadro atual (tabela em `src/lib/hero-luma.ts`, calculada
 * offline) e se ajusta para deixar SEMPRE a mesma luminância sob o texto.
 *
 * Por que não fixo: a área da copy varia de 11 a 208 ao longo da sequência.
 * O valor que segura o contraste no quadro claro afunda o quadro escuro em
 * breu, e o valor que preserva o escuro não segura o claro. Só medindo dá
 * pra ter as duas coisas.
 *
 * Por que offline: medir no browser exigiria `getImageData` a cada quadro,
 * que força leitura de volta da GPU e trava o pipeline no meio do scroll.
 */
/**
 * Alvo de luminância sob o texto. Subiu de 42 para 58 quando a frase ganhou
 * sombra própria (`copyWash` no JSX): com o reforço local, o véu GLOBAL pode
 * recuar. Média do scrim caiu de 0,58 para 0,44 — quase um quarto menos
 * sombreamento na tela, com o mesmo contraste na copy. Sombra localizada é
 * mais barata visualmente do que escurecer a base inteira.
 */
const SCRIM_TARGET_LUMA = 58;
const SCRIM_MIN = 0.12;
const SCRIM_MAX = 0.88;

/** Opacidade que leva um quadro de luminância `l` até o alvo. */
function scrimFor(l: number) {
  if (l <= SCRIM_TARGET_LUMA) return SCRIM_MIN;
  return Math.min(SCRIM_MAX, Math.max(SCRIM_MIN, 1 - SCRIM_TARGET_LUMA / l));
}

/**
 * Mola do scrim. Nos cortes da montagem a luminância salta de uma vez (11 →
 * 208), e sem amortecimento o sombreamento piscaria junto. Curta de propósito:
 * ~0,25s, o bastante pra suavizar o corte sem deixar o texto desprotegido.
 */
const SCRIM_COAST = {
  stiffness: 120,
  damping: 26,
  mass: 1,
  restDelta: 0.001,
} as const;

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
 * Tempo de acomodação ≈ 0,55s. Esse número não é só estética: rolar devagar
 * entrega poucos frames por segundo (a geometria do hero dá ~17 a 80px/s), e
 * um deslize mais longo faz a mola continuar percorrendo frames na taxa da
 * tela depois que o dedo para. Ou seja, converte um input curto e picado numa
 * corrida contínua de quadros — é a alavanca de fluidez que não custa byte.
 *
 * ζ = 16 / (2·√(26·1.1)) ≈ 1.50, ainda superamortecida: chega sem passar.
 */
const COAST = {
  stiffness: 26,
  damping: 16,
  mass: 1.1,
  restDelta: 0.0002,
} as const;

export function HeroBand() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const source: Source = isMobile ? SOURCES.mobile : SOURCES.desktop;

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

  // ── Carregamento dos frames ──────────────────────────────────────────────
  useEffect(() => {
    if (reduce) return;

    let cancelled = false;
    const images: (HTMLImageElement | undefined)[] = new Array(source.count);
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
      img.src = frameUrl(source, i);
      try {
        await img.decode();
      } catch {
        // decode() rejeita em erro de rede ou formato; cai pro onload pra não
        // travar a fila.
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      if (!cancelled) images[i] = img;
    };

    /** Índice do frame que o scroll está mostrando agora. */
    const currentIndex = () =>
      Math.round(progress.get() * (source.count - 1));

    /**
     * Carrega uma lista de índices em lotes, pulando o que já está em memória.
     *
     * A ordem é recalculada a cada lote pela distância ao frame ATUAL. Sem
     * isso, quem rola até o fim fica esperando o carregamento chegar lá pela
     * ordem dos arquivos. Assim o download persegue o usuário.
     */
    const loadBatch = async (indices: number[], token?: () => boolean) => {
      const pending = new Set(indices.filter((i) => !images[i]));
      while (pending.size > 0) {
        if (cancelled || (token && !token())) return;
        const here = currentIndex();
        const next = [...pending]
          .sort((a, b) => Math.abs(a - here) - Math.abs(b - here))
          .slice(0, LOAD_CONCURRENCY);
        next.forEach((i) => pending.delete(i));
        await Promise.all(next.map(load));
      }
    };

    if (isMobile) {
      /**
       * MOBILE — janela deslizante.
       *
       * Segurar a sequência inteira decodificada estoura a memória do telefone
       * e o iOS mata a aba. Aqui só vive o que está perto do frame atual: o que
       * sai da janela é descartado, e o browser recupera o bitmap. Recarregar
       * depois é barato porque o arquivo continua no cache de HTTP — o custo é
       * só decodificar de novo.
       */
      let generation = 0;
      let lastCenter = Number.NEGATIVE_INFINITY;

      const reconcile = () => {
        const center = currentIndex();
        // Só reage a movimento real, senão reconciliaria a cada tique da mola.
        if (Math.abs(center - lastCenter) < 4) return;
        lastCenter = center;

        const mine = ++generation;
        const alive = (i: number) =>
          i >= center - WINDOW_BEHIND - WINDOW_SLACK &&
          i <= center + WINDOW_AHEAD + WINDOW_SLACK;

        for (let i = 0; i < source.count; i++) {
          if (images[i] && !alive(i)) images[i] = undefined;
        }

        const want: number[] = [];
        for (let d = 0; d <= WINDOW_AHEAD; d++) {
          if (center + d < source.count) want.push(center + d);
          if (d > 0 && d <= WINDOW_BEHIND && center - d >= 0)
            want.push(center - d);
        }
        void loadBatch(want, () => mine === generation).then(() => {
          if (!cancelled) setReady(true);
        });
      };

      reconcile();
      const unsubscribe = progress.on("change", reconcile);
      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    // DESKTOP — densidade progressiva sobre a sequência inteira.
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
        for (let i = 0; i < source.count; i += step) indices.push(i);
        await loadBatch(indices);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMobile, reduce, source, progress]);

  // ── Canvas: dimensiona e desenha o frame do scroll atual ─────────────────
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // `alpha: false` deixa o compositor pular a mistura com o fundo: o frame é
    // opaco e cobre o canvas inteiro. Contexto cacheado — pegar a cada quadro
    // é trabalho jogado fora.
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    /**
     * Reamostragem de ALTA qualidade. O padrão do browser é "low", e sempre que
     * o canvas não está exatamente 1:1 com a fonte — o que acontece em toda
     * janela cuja proporção difere de 16:9 — o filtro barato serrilha as
     * bordas. Na prática lê como "dá pra ver cada pixel". Custa quase nada
     * porque são no máximo dois `drawImage` por quadro de tela.
     */
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    let lastKey = -1;
    let rafId = 0;

    /**
     * Sub-passos de mistura por frame. O hero consome ~1620px de scroll para
     * 361 frames, ou seja ~4,5px por frame: rolando devagar, o índice fica
     * parado por vários pixels e depois salta. Arredondar o índice transforma
     * movimento contínuo em degraus, e degrau lento lê como travamento.
     *
     * Com 16 sub-passos existem ~5800 estados visuais em vez de 361. O laço já
     * roda uma vez por quadro de tela, então elevar isto não adiciona desenho:
     * só impede que a guarda de repaint descarte um passo que o olho veria.
     */
    const BLEND_STEPS = 16;

    /**
     * Acima desta velocidade não vale dissolver: o movimento já borra sozinho e
     * o segundo `drawImage` seria trabalho puro. Em progresso normalizado por
     * segundo — 0.12 equivale a atravessar o hero em ~8s.
     */
    const BLEND_SPEED_LIMIT = 0.12;

    /** Busca o frame carregado mais próximo, olhando pros dois lados. */
    const nearest = (i: number) => {
      const imgs = imagesRef.current;
      if (imgs[i]) return imgs[i];
      for (let d = 1; d < source.count; d++) {
        if (imgs[i - d]) return imgs[i - d];
        if (imgs[i + d]) return imgs[i + d];
      }
      return undefined;
    };

    const cover = (img: HTMLImageElement) => {
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    /**
     * Abaixo desta velocidade consideramos parado. Parado NUNCA mistura: a
     * mola assenta em posição fracionária e um blend congelado em 50/50 vira
     * imagem dupla permanente. Em repouso, encaixa no frame mais próximo.
     */
    const SETTLE_SPEED = 0.004;

    const paint = (snap: boolean, force = false) => {
      // Índice FRACIONÁRIO: é o que permite dissolver entre vizinhos.
      const f = Math.min(
        source.count - 1,
        Math.max(0, progress.get() * (source.count - 1)),
      );
      // Em repouso a chave é o frame inteiro; em movimento, o sub-passo.
      const key = snap ? Math.round(f) * BLEND_STEPS : Math.round(f * BLEND_STEPS);
      if (key === lastKey && !force) return;

      if (snap) {
        const only = nearest(Math.round(f));
        if (!only) return;
        cover(only);
        lastKey = key;
        return;
      }

      const i0 = Math.floor(f);
      const t = f - i0;
      const a = nearest(i0);
      if (!a) return;

      cover(a);

      // Dissolve com o próximo só quando estamos entre frames E devagar.
      const slow = Math.abs(progress.getVelocity()) < BLEND_SPEED_LIMIT;
      if (slow && t > 0.02 && i0 + 1 < source.count) {
        const b = imagesRef.current[i0 + 1];
        if (b) {
          ctx.globalAlpha = t;
          cover(b);
          ctx.globalAlpha = 1;
        }
      }

      lastKey = key;
    };

    /**
     * Laço que só vive enquanto há movimento. Um draw por quadro de tela, no
     * máximo — sem isso, uma rajada de tiques da mola vira uma rajada de
     * drawImage dentro do mesmo quadro.
     *
     * Ao detectar repouso, faz UM último desenho encaixado no frame inteiro e
     * se encerra. É esse último passo que elimina a imagem dupla parada.
     */
    const loop = () => {
      const settled = Math.abs(progress.getVelocity()) < SETTLE_SPEED;
      paint(settled);
      if (settled) {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(loop);
    };

    const schedule = () => {
      if (!rafId) rafId = requestAnimationFrame(loop);
    };

    const resize = () => {
      /**
       * Regra: usar toda a resolução da fonte, e nem um pixel além.
       *
       * Um cap fixo de DPR erra dos dois lados — desperdiça em tela grande
       * (ampliando o que não existe na fonte) e desperdiça nitidez em tela
       * pequena de DPR alto, onde caberia a fonte inteira. Aqui o alvo é o
       * menor entre "o que a tela pede" e "o que o frame tem".
       */
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      // Cap em 3 para acompanhar telefone de DPR 3 — com cap 2 o canvas
      // desenhava 780px e a tela esticava para 1170, e a peça saía mole. O
      // `source.width` abaixo é quem impede desperdício.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const targetWidth = Math.min(width * dpr, source.width);
      const k = targetWidth / width;
      canvas.width = Math.round(width * k);
      canvas.height = Math.round(height * k);
      paint(true, true);
    };

    resize();
    window.addEventListener("resize", resize);
    const unsub = progress.on("change", schedule);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafId) cancelAnimationFrame(rafId);
      unsub();
    };
  }, [reduce, source, progress, ready]);

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
  /**
   * Opacidade do scrim, derivada do quadro atual pela tabela de luminância.
   * Passa por mola curta para os cortes da montagem não fazerem o
   * sombreamento piscar.
   */
  const luma = isMobile ? LUMA_MOBILE : LUMA_DESKTOP;
  const scrimRaw = useTransform(progress, (p) => {
    const i = Math.min(
      luma.length - 1,
      Math.max(0, Math.round(p * (luma.length - 1))),
    );
    return scrimFor(luma[i] ?? 128);
  });
  const scrim = useSpring(scrimRaw, SCRIM_COAST);

  /**
   * A copy sobe de leve e sai antes do fim, para o hero fechar na imagem
   * limpa em vez de empurrar texto para dentro da vitrine.
   */
  const copyY = useTransform(progress, [0, 1], ["0%", "-18%"]);
  const copyOpacity = useTransform(progress, [0.55, 0.82], [1, 0]);
  const indicatorOpacity = useTransform(progress, [0, 0.05], [1, 0]);

  return (
    <section
      ref={containerRef}
      aria-label="Andre Watches — relógios de luxo"
      /* Marca a seção como palco escuro: o Header mede o progresso contra ela
         pra saber quando virar papel. Ver src/components/layout/Header.tsx. */
      data-stage-hero=""
      className="relative"
      style={{ height: reduce ? "100vh" : "250vh" }}
    >
      <div className="on-stage sticky top-0 h-screen w-full overflow-hidden">
        {/* Faixa: cresce do cinemascope até a sangria total */}
        <div className="absolute inset-0">
          {reduce ? (
            // Sem movimento: um quadro parado, sem baixar sequência nenhuma.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isMobile ? POSTER_MOBILE : POSTER}
              alt="Relógio de luxo em detalhe macro"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              />
              {!ready && (
                // Poster enquanto os primeiros quadros não chegam — no telefone
                // é o que evita a faixa abrir sobre um retângulo vazio.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={isMobile ? POSTER_MOBILE : POSTER}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </>
          )}

          {/*
            Scrim adaptativo. Gradiente fixo, opacidade variável: a intensidade
            vem da luminância do quadro atual, então o texto sempre assenta na
            mesma base independente do que a footage está fazendo.
          */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: reduce ? 0.55 : scrim,
              background:
                "linear-gradient(to top, rgba(6,7,8,1) 0%, rgba(6,7,8,0.95) 26%, rgba(6,7,8,0.7) 52%, rgba(6,7,8,0.25) 76%, transparent 100%)",
            }}
          />

          {/* Vinheta lateral — fecha as bordas e puxa o olho pro centro. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(125% 105% at 50% 42%, transparent 45%, rgba(6,7,8,0.55) 100%)",
            }}
          />

          {/* Sombra sob o header, pra nav não flutuar sobre quadro claro. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{
              height: "22%",
              background:
                "linear-gradient(to bottom, rgba(6,7,8,0.75) 0%, transparent 100%)",
            }}
          />
        </div>

        {/*
          Sombra local da copy. Elipse suave atrás da frase, acima do scrim e
          abaixo do texto. Some junto com a copy — sem isso ficaria uma mancha
          escura na tela depois que a frase sai.

          É ela que permite o scrim global ser mais leve: em vez de escurecer
          toda a base pra proteger um bloco de texto, escurece só onde o texto
          está.
        */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            ...(reduce ? {} : { opacity: copyOpacity }),
            background:
              "radial-gradient(75% 58% at 28% 82%, rgba(6,7,8,0.70) 0%, rgba(6,7,8,0.42) 42%, transparent 76%)",
          }}
        />

        {/*
          Copy sobre a imagem — é a camada principal agora, não legenda de
          margem. Ancorada embaixo à esquerda, sobre a sombra local.
        */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-14 will-change-transform md:px-16 md:pb-20"
          style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <p className="eyebrow pointer-events-auto">
              Relógios de luxo · desde 2012
            </p>

            <h1
              className="pointer-events-auto max-w-4xl text-balance"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.75rem, 9vw, 8rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
                textShadow: "0 1px 28px rgba(6,7,8,0.8)",
              }}
            >
              O tempo tem procedência.
            </h1>

            <p
              className="pointer-events-auto hidden max-w-md text-base leading-relaxed md:block md:text-lg"
              style={{
                color: "var(--color-muted)",
                textShadow: "0 1px 18px rgba(6,7,8,0.8)",
              }}
            >
              Rolex e outras maisons premium, conferidas peça a peça antes de
              entrarem na vitrine.
            </p>

            <div className="pointer-events-auto mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link href="/colecao" className="btn btn-primary group">
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
          </div>
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
