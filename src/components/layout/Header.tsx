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
  AnimatePresence,
  type MotionStyle,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { sair } from "@/app/(site)/acesso/actions";

import { ClienteNavMobile } from "./ClienteNavMobile";

const NAV_PUBLICA = [
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

export function Header({
  isClienteAtivo,
  isAdmin = false,
}: {
  isClienteAtivo: boolean;
  isAdmin?: boolean;
}) {
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [menuAberto, setMenuAberto] = useState(false);
  /**
   * 1 = papel. A home já nasce em 0 para o HTML inicial não piscar claro antes
   * de o efeito encontrar o palco; a medição do DOM continua sendo a verdade.
   */
  const progress = useMotionValue(pathname === "/" ? 0 : 1);

  // Trocar de rota fecha o menu do celular — sem isso ele ficaria aberto por
  // cima da página nova depois de um clique num link.
  useLayoutEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useLayoutEffect(() => {
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
      // No desktop, `consumed` é ~150vh e continua exatamente como antes. No
      // mobile o hero tem uma tela e não sobra distância de scroll; 60vh evita
      // que diferenças do viewport do iOS comprimam a virada em um degrau.
      const alcance = Math.max(consumed, window.innerHeight * 0.6);
      progress.set(Math.min(1, Math.max(0, -rect.top / alcance)));
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
  /*
   * Três públicos, três menus.
   *
   * O admin não é cliente: mandá-lo para `/acervo/conta` o levava a um beco —
   * aquela rota exige `clientes.status = 'ativo'`, que ele não tem, e o
   * middleware acabava despejando ele no painel sem explicação.
   */
  const navLinks = isAdmin
    ? [
        { href: "/painel", label: "Painel" },
        { href: "/acervo", label: "Acervo" },
        ...NAV_PUBLICA,
      ]
    : isClienteAtivo
      ? [
          { href: "/acervo", label: "Acervo" },
          { href: "/acervo/conta", label: "Minha conta" },
          ...NAV_PUBLICA,
        ]
      : NAV_PUBLICA;

  const autenticado = isAdmin || isClienteAtivo;
  const mostrarBarraMobile = isClienteAtivo || isAdmin;

  const estaNoShell = [
    "/acervo",
    "/vender",
    "/sobre",
    "/acervo/conta",
  ].includes(pathname);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    if (href === "/painel") return;

    if (estaNoShell && [
      "/acervo",
      "/vender",
      "/sobre",
      "/acervo/conta",
    ].includes(href)) {
      e.preventDefault();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cliente:mudar-aba", { detail: href })
        );
      }
    }
  };

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 border-b print:hidden"
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
            <span
              className="label"
              style={{ color: "var(--color-foreground)" }}
            >
              Andre<span style={{ color: "var(--color-muted)" }}> · </span>
              Watches
            </span>
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-10 md:flex"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="label link-quiet"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            {autenticado ? (
              <form action={sair}>
                <button type="submit" className="label link-quiet">
                  Sair
                </button>
              </form>
            ) : (
              <Link href="/acesso" className="label link-quiet">
                Entrar
              </Link>
            )}
          </div>

          {!mostrarBarraMobile && (
            <button
              type="button"
              className="md:hidden"
              aria-expanded={menuAberto}
              aria-controls="menu-celular"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuAberto((v) => !v)}
            >
              <MenuIcon aberto={menuAberto} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {menuAberto && !mostrarBarraMobile && (
            <motion.nav
              id="menu-celular"
              aria-label="Navegação principal (celular)"
              className="absolute inset-x-0 top-full flex flex-col gap-1 border-t px-6 py-6 md:hidden"
              style={{ background, borderColor: border }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: reduceMotion ? 0 : 0.3,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    setMenuAberto(false);
                    handleLinkClick(e, link.href);
                  }}
                  className="label link-quiet py-3"
                >
                  {link.label}
                </Link>
              ))}
              <div
                className="mt-2 border-t pt-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                {autenticado ? (
                  <form action={sair}>
                    <button type="submit" className="label link-quiet py-3">
                      Sair
                    </button>
                  </form>
                ) : (
                  <Link href="/acesso" className="label link-quiet py-3">
                    Entrar
                  </Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
      {mostrarBarraMobile && <ClienteNavMobile isAdmin={isAdmin} />}
    </>
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

/** Alterna entre hambúrguer e X — mesmo traço fino do Monogram. */
function MenuIcon({ aberto }: { aberto: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      {aberto ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}
