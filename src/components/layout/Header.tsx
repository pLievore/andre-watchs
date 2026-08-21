"use client";

/**
 * Header global — fixo no topo, com transição de palco para papel.
 *
 * O site é papel, mas o hero é palco escuro (SPEC §3.1). Um header de papel
 * parado sobre o hero recria exatamente o defeito que o palco resolve: uma
 * faixa clara colada em cima do filme. Então o header acompanha — nasce escuro
 * junto com o palco e vira papel quando o hero termina.
 *
 * Como sabe onde está: procura `[data-stage-hero]` na página e mede o próprio
 * progresso contra a altura dele. Página sem palco (acervo, PDP, a casa) já
 * começa em papel — nenhuma configuração por rota, nenhum estado global.
 *
 * A transição interpola TOKENS, não cores soltas: `--color-foreground`,
 * `--color-muted` e `--color-border` são reescritos no header, então logo, nav
 * e CTA se invertem por herança em vez de cada um ter lógica própria.
 */

import {
  type MotionStyle,
  motion,
  useMotionValue,
  useScroll,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useEffect } from "react";

import { WhatsappCta } from "@/components/contact/WhatsappCta";

const NAV_LINKS = [
  { href: "/colecao", label: "Acervo" },
  { href: "/vender", label: "Vender" },
  { href: "/sobre", label: "A casa" },
] as const;

/** Espelham os tokens do `globals.css`. */
const STAGE = {
  bg: "#0d0e0f",
  fg: "#f2f0ea",
  muted: "#9b978f",
  border: "#2a2c2e",
};
const PAPER = {
  bg: "#faf8f4",
  fg: "#17181a",
  muted: "#6e6a63",
  border: "#e2ded6",
};

/**
 * Janela da virada, em fração do hero.
 *
 * A barra é opaca, então o vídeo atrás não interfere — o risco é outro: fundo e
 * texto interpolam juntos e cruzam o cinza médio no meio do caminho, onde os
 * dois ficam parecidos. Por isso a virada não cobre o hero inteiro; ela ocupa o
 * último terço e termina pouco antes da vitrine chegar. Abrir mais a janela
 * deixa a transição mais visível e mais tempo no cinza; fechar aproxima do
 * corte seco.
 */
const FLIP_START = 0.62;
/** Onde termina — pouco antes do hero sair, para não haver papel sobre o filme. */
const FLIP_END = 0.98;

export function Header() {
  const { scrollY } = useScroll();
  /** 1 = papel. Sem palco na página, é onde fica e nunca sai. */
  const progress = useMotionValue(1);

  useEffect(() => {
    const hero = document.querySelector<HTMLElement>("[data-stage-hero]");
    if (!hero) {
      progress.set(1);
      return;
    }

    /**
     * Medição AO VIVO, a cada evento de scroll.
     *
     * A versão anterior media `offsetTop`/`offsetHeight` uma única vez na
     * montagem. Se o layout ainda não tivesse assentado nesse instante, o
     * alcance saía errado — e alcance curto demais faz o progresso pular
     * direto pra 1, que é o cabeçalho ficando branco de uma vez. Ler o
     * retângulo a cada scroll custa uma leitura de layout por evento e é
     * imune a isso, a `offsetParent` aninhado e a mudanças de altura.
     */
    const update = () => {
      const rect = hero.getBoundingClientRect();
      const consumed = hero.offsetHeight - window.innerHeight;
      if (consumed <= 0) {
        progress.set(1);
        return;
      }
      progress.set(Math.min(1, Math.max(0, -rect.top / consumed)));
    };

    update();
    const unsubscribe = scrollY.on("change", update);
    window.addEventListener("resize", update);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", update);
    };
  }, [progress, scrollY]);

  const range: [number, number] = [FLIP_START, FLIP_END];
  const background = useTransform(progress, range, [STAGE.bg, PAPER.bg]);
  const foreground = useTransform(progress, range, [STAGE.fg, PAPER.fg]);
  const muted = useTransform(progress, range, [STAGE.muted, PAPER.muted]);
  const border = useTransform(progress, range, [STAGE.border, PAPER.border]);

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 border-b"
      style={
        {
          background,
          color: foreground,
          borderColor: border,
          // Reescreve os tokens no escopo do header: os filhos herdam.
          "--color-foreground": foreground,
          "--color-muted": muted,
          "--color-border": border,
        } as MotionStyle
      }
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-16 md:py-7">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="ANDRE WATCHES — página inicial"
        >
          <Monogram />
          <span className="label" style={{ color: "var(--color-foreground)" }}>
            Andre<span style={{ color: "var(--color-muted)" }}> · </span>Watches
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-10 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="label link-quiet">
              {link.label}
            </Link>
          ))}
        </nav>

        <WhatsappCta
          variant="link"
          label="Falar com a casa"
          context="Vim pelo site e gostaria de falar sobre uma peça."
        />
      </div>
    </motion.header>
  );
}

/**
 * Monograma "A", ecoando o avatar do Instagram. Herda `currentColor` em vez de
 * fixar o acento — o acento é tinta, que sobre o palco escuro seria invisível.
 */
function Monogram() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <circle cx="12" cy="12" r="11" strokeWidth="0.8" opacity="0.5" />
      <path d="M8 17V9.5L12 6l4 3.5V17" />
      <path d="M8 12.6h8" />
    </svg>
  );
}
