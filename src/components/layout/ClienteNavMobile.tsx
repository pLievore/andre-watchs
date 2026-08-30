"use client";

/**
 * Barra inferior do cliente e do admin na área da vitrine/acervo.
 * A navegação recorrente fica ao alcance do polegar.
 * O admin enxerga exatamente como o cliente, com o destino "Painel" no lugar de "Conta".
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { dispararVibracao } from "@/lib/haptics";

const DESTINOS_CLIENTE = [
  { href: "/acervo", rotulo: "Acervo", icone: IconeAcervo },
  { href: "/vender", rotulo: "Vender", icone: IconeVender },
  { href: "/sobre", rotulo: "A casa", icone: IconeCasa },
  { href: "/acervo/conta", rotulo: "Conta", icone: IconeConta },
] as const;

const DESTINOS_ADMIN = [
  { href: "/acervo", rotulo: "Acervo", icone: IconeAcervo },
  { href: "/vender", rotulo: "Vender", icone: IconeVender },
  { href: "/sobre", rotulo: "A casa", icone: IconeCasa },
  { href: "/painel", rotulo: "Painel", icone: IconePainel },
] as const;

function estaAtivo(href: string, atual: string) {
  if (href === "/painel") return atual.startsWith("/painel");
  if (href === "/acervo/conta") return atual.startsWith(href);
  if (href === "/acervo") {
    return (
      atual === href ||
      (atual.startsWith(`${href}/`) && !atual.startsWith("/acervo/conta"))
    );
  }
  return atual === href || atual.startsWith(`${href}/`);
}

export function ClienteNavMobile({ isAdmin = false }: { isAdmin?: boolean }) {
  const atual = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const destinos = isAdmin ? DESTINOS_ADMIN : DESTINOS_CLIENTE;
  const [otimista, setOtimista] = useState<string | null>(null);
  const [rotaAtivaClient, setRotaAtivaClient] = useState<string | null>(null);

  // Pré-carrega ativamente as abas no cache local do cliente para resposta instantânea
  useEffect(() => {
    destinos.forEach(({ href }) => router.prefetch(href));
  }, [destinos, router]);

  // Escuta evento emitido pelo SiteTabShell quando o usuário arrasta o dedo
  useEffect(() => {
    function onTabMudou(e: Event) {
      const custom = e as CustomEvent<string>;
      if (custom.detail) {
        setRotaAtivaClient(custom.detail);
        setOtimista(null);
      }
    }
    window.addEventListener("cliente:tab-mudou", onTabMudou);
    return () => window.removeEventListener("cliente:tab-mudou", onTabMudou);
  }, []);

  // Sincroniza e reseta o clique otimista assim que a navegação do Next.js se consolida
  useEffect(() => {
    setOtimista(null);
    setRotaAtivaClient(null);
  }, [atual]);

  const rotaAtiva = otimista ?? rotaAtivaClient ?? atual;

  const SITE_ROTAS_SHELL = [
    "/acervo",
    "/vender",
    "/sobre",
    "/acervo/conta",
  ];
  const estaNoShell = SITE_ROTAS_SHELL.includes(atual);
  const tabIndexAtual = SITE_ROTAS_SHELL.indexOf(rotaAtiva);
  const progressoPadrao = tabIndexAtual !== -1 ? tabIndexAtual : 0;

  const handleNavegar = (e: React.MouseEvent, href: string) => {
    if (href === "/painel") {
      dispararVibracao(10);
      setOtimista(href);
      return;
    }

    if (estaNoShell && SITE_ROTAS_SHELL.includes(href)) {
      // Sem vibrar aqui: quem vibra é o shell, no instante em que a aba vira.
      // Vibrar nos dois lugares dá buzz duplo no mesmo toque.
      e.preventDefault();
      setOtimista(href);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("cliente:mudar-aba", { detail: href })
        );
      }
    } else {
      dispararVibracao(10);
      setOtimista(href);
    }
  };

  return (
    <nav
      aria-label="Navegação móvel"
      // Arrastar o dedo pela barra troca de aba, e no iPhone é o único gesto
      // que vibra: os switches nativos dos botões estão sob o dedo, e desde o
      // iOS 26.5 só a manipulação física deles aciona a Taptic Engine. O
      // `SiteTabShell` procura este atributo para não descartar o gesto, e usa
      // a largura da barra para saber sobre qual aba o dedo está.
      data-swipe-nav
      className="fixed inset-x-0 bottom-0 z-50 flex border-t md:hidden print:hidden"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-background)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Linha indicadora que acompanha 100% o movimento do dedo em tempo real */}
      {estaNoShell && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 h-[2px] w-[25%]"
          style={{
            transform: `translateX(calc(var(--site-tab-progress, ${progressoPadrao}) * 100%))`,
            willChange: "transform",
          }}
        >
          <span
            className="mx-auto block h-full w-[60%]"
            style={{
              background: "var(--color-foreground)",
              borderRadius: "0 0 2px 2px",
            }}
          />
        </div>
      )}

      {destinos.map(({ href, rotulo, icone: Icone }, index) => {
        const ativo = estaAtivo(href, rotaAtiva);
        const carregandoEstaAba = otimista === href && otimista !== atual;

        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            onClick={(e) => handleNavegar(e, href)}
            aria-current={ativo ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-200"
            style={{
              minHeight: 58,
              color: ativo ? "var(--color-foreground)" : "var(--color-muted)",
              transitionTimingFunction: "var(--ease-editorial)",
            }}
          >
            {/* Gatilho físico da Taptic Engine no iPhone (acionado no clique ou no término do deslize) */}
            <label
              htmlFor={`cliente-tab-input-${index}`}
              id={`cliente-tab-label-${index}`}
              className="absolute inset-0 z-10 block h-full w-full cursor-pointer"
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <input
                type="checkbox"
                id={`cliente-tab-input-${index}`}
                aria-hidden="true"
                tabIndex={-1}
                switch=""
                className="absolute inset-0 h-full w-full opacity-0 cursor-pointer pointer-events-auto"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
                onClick={(e) => handleNavegar(e, href)}
              />
            </label>

            {!estaNoShell && ativo && (
              <motion.span
                layoutId={reduceMotion ? undefined : "cliente-nav-indicator"}
                aria-hidden
                className="absolute inset-x-[20%] top-0 h-[2px]"
                style={{
                  background: "var(--color-foreground)",
                  borderRadius: "0 0 2px 2px",
                }}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                }}
              />
            )}
            {ativo && (
              <motion.span
                layoutId={reduceMotion ? undefined : "cliente-nav-backdrop"}
                aria-hidden
                className="absolute inset-1.5 -z-10 rounded-lg"
                style={{
                  background: "rgba(0, 0, 0, 0.035)",
                }}
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                }}
              />
            )}
            <motion.div
              animate={{
                scale: ativo ? 1.08 : 1,
                y: ativo ? -1 : 0,
                opacity: carregandoEstaAba ? [0.4, 1, 0.4] : 1,
              }}
              transition={{
                scale: { type: "spring", stiffness: 450, damping: 28 },
                opacity: carregandoEstaAba
                  ? { repeat: Infinity, duration: 0.7, ease: "easeInOut" }
                  : undefined,
              }}
            >
              <Icone />
            </motion.div>
            <span
              className="flex items-center gap-1"
              style={{
                fontSize: "0.7rem",
                fontWeight: ativo ? 600 : 400,
                letterSpacing: ativo ? "-0.01em" : "normal",
              }}
            >
              {rotulo}
              {carregandoEstaAba && (
                <span
                  className="inline-block h-1 w-1 rounded-full animate-ping"
                  style={{ background: "var(--color-foreground)" }}
                />
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

const svg = {
  width: 19,
  height: 19,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconeAcervo() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8.5V12l2.4 1.5M9.5 3h5M9.5 21h5" />
    </svg>
  );
}

function IconeVender() {
  return (
    <svg {...svg}>
      <path d="M4 7.5h12.5l3.5 3.6-8.9 8.9L4 12.9Z" />
      <circle cx="8" cy="11" r="1" />
    </svg>
  );
}

function IconeCasa() {
  return (
    <svg {...svg}>
      <path d="m4 11 8-7 8 7M6.5 9.5V20h11V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  );
}

function IconeConta() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function IconePainel() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}