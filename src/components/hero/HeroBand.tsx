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
  useMotionValue,
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
 * Sequência de quadros — SÓ no desktop.
 *
 * O telefone recebe um `<video>` nativo em loop. O scrubbing por scroll exige
 * que o hero consuma 250vh, e no celular isso vira uma parede: o polegar rola,
 * rola, e a página não sai do lugar. Uma tela cheia de altura e o vídeo tocando
 * sozinho entrega a mesma imagem sem sequestrar a navegação.
 */
const FRAME_COUNT = 361;
const FRAME_WIDTH = 1920;
const FRAME_DIR = "/hero-sequence";
const FRAME_PREFIX = "aw-hero";

function frameUrl(i: number) {
  return `${FRAME_DIR}/${FRAME_PREFIX}-${String(i + 1).padStart(3, "0")}.webp`;
}

/**
 * Vídeo do mobile: recorte 3:4 a partir da fonte. Em retrato o `object-cover`
 * descarta as laterais de um 16:9, então entregar o quadro cheio seria pagar
 * banda por pixel que ninguém vê — o recorte custa metade.
 *
 * É um BOOMERANG: 12s de ida seguidos de 12s de volta, num arquivo só. O corte
 * seco de volta ao início é justamente o instante em que o olho percebe que é
 * um loop; indo e voltando, o movimento não tem emenda. Reproduzir ao contrário
 * por JS (`playbackRate = -1`) não é opção — o iOS não suporta.
 *
 * A ida e a volta descartam um quadro cada, senão a virada e o emendo do loop
 * repetiriam um quadro e dariam um soluço. Ver `scripts/` no CLAUDE.md.
 */
const MOBILE_VIDEO = "/hero-mobile.mp4";
/** Quadro parado — o que o reduced-motion mostra no lugar de tudo. */
const POSTER = "/hero-poster.jpg";
const POSTER_MOBILE = "/hero-poster-mobile.jpg";
/** Quadros por segundo da tabela de luminância do mobile — ver hero-luma.ts. */
const MOBILE_LUMA_FPS = 15;

/**
 * Cabeça densa mínima, só para o primeiro palmo de scroll não pular enquanto
 * o esqueleto ainda está descendo. Deliberadamente pequena: é ela que segura
 * o poster na tela, e cada frame a mais aqui é tempo a mais de espera.
 */
const ARRANQUE = 8;

/**
 * Passadas de densidade progressiva — **cobertura antes de densidade**.
 *
 * A primeira passada é rala e cobre a sequência INTEIRA. Isso é o que impede
 * o sintoma clássico de primeiro acesso: o scroll passa do trecho carregado,
 * `nearest()` não acha nada adiante e segura o último quadro disponível — a
 * tela congela enquanto a página continua rolando, e parece travamento.
 *
 * Antes daqui saíam 28 quadros seguidos antes de qualquer cobertura, o que
 * dava densidade perfeita em 7% da sequência e nada nos outros 93%. Agora o
 * primeiro passe põe um quadro a cada 12 (~31 arquivos) do começo ao fim: no
 * pior caso o scrubbing fica granulado, nunca parado. As passadas seguintes
 * dobram a densidade, e a fluidez cresce com o tempo em vez de a cobertura
 * crescer com a distância.
 *
 * Cada lote é reordenado pela distância ao quadro ATUAL (ver `loadBatch`),
 * então o download persegue o dedo de quem está rolando.
 */
const DENSITY_PASSES = [12, 6, 3, 2, 1] as const;

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

export function HeroBand({ podeAbrirAcervo }: { podeAbrirAcervo: boolean }) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imagesRef = useRef<(HTMLImageElement | undefined)[]>([]);
  /**
   * Redesenho pedido de fora do laço de scroll.
   *
   * O laço só vive enquanto há movimento — parado, ele se encerra. Sem isto,
   * um quadro que chega DEPOIS de a pessoa parar não aparece: a tela fica no
   * vizinho aproximado mesmo já tendo o certo em memória, até o próximo
   * movimento. É o que fazia a imagem parecer "de menor qualidade" logo
   * depois do primeiro acesso.
   */
  const repintarRef = useRef<(() => void) | null>(null);
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

  // ── Carregamento dos frames (só desktop) ─────────────────────────────────
  useEffect(() => {
    if (reduce || isMobile) return;

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
        // decode() rejeita em erro de rede ou formato; cai pro onload pra não
        // travar a fila.
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }
      if (cancelled) return;
      images[i] = img;

      // Se a pessoa já parou de rolar, o laço de desenho não está mais vivo e
      // o quadro recém-chegado só apareceria no próximo movimento. Este pedido
      // troca o vizinho aproximado pelo quadro certo assim que ele existe.
      repintarRef.current?.();
    };

    /** Índice do frame que o scroll está mostrando agora. */
    const currentIndex = () =>
      Math.round(progress.get() * (FRAME_COUNT - 1));

    /**
     * Carrega uma lista de índices em lotes, pulando o que já está em memória.
     *
     * A ordem é recalculada a cada lote pela distância ao frame ATUAL. Sem
     * isso, quem rola até o fim fica esperando o carregamento chegar lá pela
     * ordem dos arquivos. Assim o download persegue o usuário.
     */
    const loadBatch = async (indices: number[]) => {
      const pending = new Set(indices.filter((i) => !images[i]));
      while (pending.size > 0) {
        if (cancelled) return;
        const here = currentIndex();

        /*
         * Distância pesada pelo sentido do scroll.
         *
         * Distância pura trata igualmente o quadro que vem e o que ficou para
         * trás — e, na primeira descida, metade da banda ia para quadros que a
         * pessoa acabou de passar. O que está à frente é o próximo a entrar na
         * tela; o de trás só importa se ela voltar.
         */
        const descendo = progress.getVelocity() >= 0;
        const custo = (i: number) => {
          const distancia = Math.abs(i - here);
          const aFrente = descendo ? i >= here : i <= here;
          return aFrente ? distancia : distancia * 3;
        };

        const next = [...pending]
          .sort((a, b) => custo(a) - custo(b))
          .slice(0, LOAD_CONCURRENCY);
        next.forEach((i) => pending.delete(i));
        await Promise.all(next.map(load));
      }
    };

    // Densidade progressiva sobre a sequência inteira.
    (async () => {
      // 1. Arranque curto: o suficiente para trocar o poster pelo canvas sem
      //    que o primeiro palmo de scroll pule.
      await loadBatch(Array.from({ length: ARRANQUE }, (_, i) => i));
      if (cancelled) return;
      setReady(true);

      // 2. Esqueleto e refinamentos: a primeira passada cobre a sequência
      //    inteira antes de qualquer adensamento, então nunca existe um trecho
      //    descoberto — só um trecho granulado, que ainda se move.
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
  }, [isMobile, reduce, progress]);

  // ── Canvas: dimensiona e desenha o frame do scroll atual ─────────────────
  useEffect(() => {
    if (reduce || isMobile) return;
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
      for (let d = 1; d < FRAME_COUNT; d++) {
        if (imgs[i - d]) return imgs[i - d];
        if (imgs[i + d]) return imgs[i + d];
      }
      return undefined;
    };

    /**
     * Os dois quadros carregados que cercam a posição atual, com a fração de
     * onde ela cai entre eles.
     *
     * É o que mantém o movimento vivo enquanto a sequência está esparsa. Com
     * `nearest` sozinho, um vão de 12 quadros vira "segura, segura, segura,
     * pula": a tela congela e depois salta, que é exatamente a queixa de
     * travamento no primeiro acesso. Dissolvendo entre os vizinhos existentes,
     * o mesmo vão vira um movimento contínuo, um pouco mais macio que o real —
     * e macio demais é infinitamente melhor que parado.
     *
     * Sem custo de rede: são os quadros que já estão em memória, na resolução
     * original.
     */
    const cerca = (f: number) => {
      const imgs = imagesRef.current;
      const i = Math.floor(f);

      let esquerda = -1;
      for (let k = i; k >= 0; k--) {
        if (imgs[k]) {
          esquerda = k;
          break;
        }
      }

      let direita = -1;
      for (let k = i + 1; k < FRAME_COUNT; k++) {
        if (imgs[k]) {
          direita = k;
          break;
        }
      }

      if (esquerda < 0 && direita < 0) return null;
      if (esquerda < 0) return { a: imgs[direita]!, b: undefined, t: 0 };
      if (direita < 0) return { a: imgs[esquerda]!, b: undefined, t: 0 };

      return {
        a: imgs[esquerda]!,
        b: imgs[direita]!,
        t: (f - esquerda) / (direita - esquerda),
        vao: direita - esquerda,
      };
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
        FRAME_COUNT - 1,
        Math.max(0, progress.get() * (FRAME_COUNT - 1)),
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

      const vizinhos = cerca(f);
      if (!vizinhos) return;

      cover(vizinhos.a);

      const { b, t, vao } = vizinhos;

      if (b) {
        /*
         * Duas situações, uma regra cada:
         *
         * - **Vão maior que 1** (sequência ainda esparsa): dissolve SEMPRE,
         *   em qualquer velocidade. Aqui a mistura não é refinamento, é o que
         *   substitui os quadros que ainda não chegaram — sem ela a imagem
         *   fica parada enquanto a página rola.
         * - **Vizinhos adjacentes** (sequência completa): dissolve só devagar,
         *   como antes. Em scroll rápido o segundo `drawImage` seria
         *   desperdício, porque o olho não distingue.
         */
        const devagar = Math.abs(progress.getVelocity()) < BLEND_SPEED_LIMIT;
        const preenchendoVao = (vao ?? 1) > 1;

        if ((preenchendoVao || devagar) && t > 0.02) {
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

    /*
     * Porta para o carregador pedir um redesenho quando um quadro chega.
     *
     * Só age em repouso: em movimento o laço já está desenhando, e um desenho
     * extra fora dele brigaria com a cadência de tela.
     */
    repintarRef.current = () => {
      if (Math.abs(progress.getVelocity()) < SETTLE_SPEED) paint(true, true);
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
      // `FRAME_WIDTH` abaixo é quem impede desperdício.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const targetWidth = Math.min(width * dpr, FRAME_WIDTH);
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
      repintarRef.current = null;
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
  /**
   * Opacidade do scrim, derivada do quadro atual pela tabela de luminância.
   * Passa por mola curta para os cortes da montagem não fazerem o
   * sombreamento piscar.
   */
  const scrimRaw = useMotionValue(scrimFor(LUMA_DESKTOP[0] ?? 128));

  /**
   * Desktop: a opacidade do scrim segue o quadro que o scroll está mostrando.
   * Mobile: segue o tempo do vídeo, convertido em índice da mesma tabela. Nos
   * dois casos o texto assenta sobre a mesma base — muda só quem informa o
   * quadro atual.
   */
  useEffect(() => {
    if (reduce) return;

    if (!isMobile) {
      const update = (p: number) => {
        const i = Math.min(
          LUMA_DESKTOP.length - 1,
          Math.max(0, Math.round(p * (LUMA_DESKTOP.length - 1))),
        );
        scrimRaw.set(scrimFor(LUMA_DESKTOP[i] ?? 128));
      };
      update(progress.get());
      return progress.on("change", update);
    }

    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && !video.paused) {
        const i = Math.min(
          LUMA_MOBILE.length - 1,
          Math.max(0, Math.round(video.currentTime * MOBILE_LUMA_FPS)),
        );
        scrimRaw.set(scrimFor(LUMA_MOBILE[i] ?? 128));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile, reduce, progress, scrimRaw]);

  const scrim = useSpring(scrimRaw, SCRIM_COAST);

  /** Só o desktop tem coreografia dirigida por scroll. */
  const scrubbing = !reduce && !isMobile;

  /**
   * A copy sobe de leve e sai antes do fim — só no desktop, onde o hero é
   * fixado por 250vh. No mobile a seção tem uma tela de altura e rola embora
   * sozinha, então mover a copy por scroll não faria sentido.
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
      /*
        250vh só onde o scroll dirige os quadros. No mobile o hero tem uma tela
        e sai do caminho — foi a queixa de "quero descer e não consigo".
      */
      style={{ height: scrubbing ? "250vh" : "100vh" }}
    >
      <div
        className={`on-stage h-screen w-full overflow-hidden ${
          scrubbing ? "sticky top-0" : "relative"
        }`}
      >
        {/* Faixa: cresce do cinemascope até a sangria total */}
        <div className="absolute inset-0">
          {reduce ? (
            // Sem movimento: um quadro parado, sem baixar sequência nem vídeo.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={isMobile ? POSTER_MOBILE : POSTER}
              alt="Relógio de luxo em detalhe macro"
              className="h-full w-full object-cover"
            />
          ) : isMobile ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              poster={POSTER_MOBILE}
              src={MOBILE_VIDEO}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-label="Detalhe em macro de um relógio de luxo"
            />
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              />
              {!ready && (
                // Poster enquanto os primeiros quadros não chegam.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={POSTER}
                  alt=""
                  aria-hidden="true"
                  // É a maior imagem da primeira tela — na prática, o que o
                  // navegador mede como carregamento da página. Sem a
                  // prioridade explícita ele a trata como imagem comum e a
                  // deixa atrás dos primeiros quadros da sequência.
                  fetchPriority="high"
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
            ...(scrubbing ? { opacity: copyOpacity } : {}),
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
          style={scrubbing ? { y: copyY, opacity: copyOpacity } : undefined}
          initial={scrubbing || reduce ? undefined : { opacity: 0, y: 18 }}
          animate={scrubbing || reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
              Relógios de luxo conferidos peça a peça. O acervo da casa é
              reservado aos clientes.
            </p>

            <div className="pointer-events-auto mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href={podeAbrirAcervo ? "/acervo" : "/acesso"}
                className="btn btn-primary group"
              >
                Acessar o acervo
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
