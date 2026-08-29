"use client";

/**
 * Navegação do painel.
 *
 * Duas formas, mesma fonte de verdade:
 *  - **desktop**: barra lateral fixa, sempre visível.
 *  - **celular**: barra inferior, ao alcance do polegar.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { sairDoPainel } from "@/app/(painel)/painel/entrar/actions";
import { dispararVibracao } from "@/lib/haptics";

const SECOES = [
  { href: "/painel", rotulo: "Clientes", icone: IconeClientes },
  { href: "/painel/dashboard", rotulo: "Dashboard", icone: IconeDashboard },
  { href: "/painel/negociacoes", rotulo: "Negociações", icone: IconeNegociacoes },
  { href: "/painel/pecas", rotulo: "Peças", icone: IconePecas },
] as const;

/** A ficha continua em `/painel/clientes/:id`, mas pertence à central. */
function estaAtivo(href: string, atual: string) {
  return href === "/painel"
    ? atual === href || atual.startsWith("/painel/clientes")
    : atual.startsWith(href);
}

export function PainelNav({ email }: { email: string }) {
  const atual = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [otimista, setOtimista] = useState<string | null>(null);

  // Pré-carrega ativamente todas as abas em cache do navegador para transição instantânea
  useEffect(() => {
    SECOES.forEach(({ href }) => router.prefetch(href));
    router.prefetch("/painel/conta");
  }, [router]);

  // Sincroniza e reseta o clique otimista assim que a rota é confirmada
  useEffect(() => {
    setOtimista(null);
  }, [atual]);

  // Sincroniza quando a aba é trocada via gesto de swipe na tela
  useEffect(() => {
    function onTabMudou(e: Event) {
      const customEvent = e as CustomEvent<string>;
      setOtimista(customEvent.detail);
    }
    window.addEventListener("painel:tab-mudou", onTabMudou);
    return () => window.removeEventListener("painel:tab-mudou", onTabMudou);
  }, []);

  const rotaAtiva = otimista ?? atual;

  const PAINEL_ROTAS_SHELL = [
    "/painel",
    "/painel/dashboard",
    "/painel/negociacoes",
    "/painel/pecas",
    "/painel/conta",
  ];

  const estaNoShell =
    atual === "/painel" ||
    atual === "/painel/clientes" ||
    PAINEL_ROTAS_SHELL.includes(atual);

  const getTabIndex = (rota: string) => {
    if (rota === "/painel" || rota === "/painel/clientes") return 0;
    if (rota === "/painel/dashboard") return 1;
    if (rota === "/painel/negociacoes") return 2;
    if (rota === "/painel/pecas") return 3;
    if (rota === "/painel/conta") return 4;
    return 0;
  };
  const progressoPadrao = getTabIndex(rotaAtiva);

  const handleNavegar = (e: React.MouseEvent, href: string) => {
    dispararVibracao(10);

    if (
      estaNoShell &&
      [
        "/painel",
        "/painel/clientes",
        "/painel/dashboard",
        "/painel/negociacoes",
        "/painel/pecas",
        "/painel/conta",
      ].includes(href)
    ) {
      e.preventDefault();
      setOtimista(href);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("painel:mudar-aba", { detail: href })
        );
      }
    } else {
      setOtimista(href);
    }
  };

  return (
    <>
      {/* ── Desktop: lateral fixa ────────────────────────────────────────── */}
      <aside
        aria-label="Navegação do painel"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r md:flex"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div
          className="flex h-16 items-center gap-3 border-b px-6"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded text-xs font-semibold tracking-wider"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-background)",
            }}
          >
            AW
          </div>
          <div className="flex flex-col">
            <span
              className="text-xs tracking-wider"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-foreground)",
              }}
            >
              ANDRE WATCHES
            </span>
            <span className="meta" style={{ fontSize: "0.65rem" }}>
              PAINEL INTERNO
            </span>
          </div>
        </div>

        <nav aria-label="Seções do painel" className="flex flex-1 flex-col gap-1 p-3">
          {SECOES.map(({ href, rotulo, icone: Icone }) => {
            const ativo = estaAtivo(href, atual);
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={(e) => handleNavegar(e, href)}
                aria-current={ativo ? "page" : undefined}
                className="relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-200"
                style={{
                  color: ativo
                    ? "var(--color-foreground)"
                    : "var(--color-muted)",
                }}
              >
                {ativo && (
                  <motion.div
                    layoutId={reduceMotion ? undefined : "painel-desktop-nav-indicator"}
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded"
                    style={{
                      background: "var(--color-surface-2)",
                      borderLeft: "2px solid var(--color-accent)",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 32,
                    }}
                  />
                )}
                <Icone />
                <span className="relative z-10">{rotulo}</span>
              </Link>
            );
          })}
        </nav>

        <div
          className="flex flex-col gap-2 border-t p-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Link
            href="/painel/conta"
            prefetch={true}
            onClick={(e) => handleNavegar(e, "/painel/conta")}
            className="meta link-quiet truncate px-3"
            title={email}
            aria-current={atual === "/painel/conta" ? "page" : undefined}
          >
            {email}
          </Link>
          <Link href="/" className="meta link-quiet px-3">
            Ver o site →
          </Link>
          <form action={sairDoPainel}>
            <button
              type="submit"
              className="meta link-quiet w-full px-3 py-1 text-left"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ── Celular: barra inferior ──────────────────────────────────────── */}
      <nav
        aria-label="Seções do painel"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t md:hidden"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Linha indicadora que acompanha 100% o movimento do dedo em tempo real */}
        {estaNoShell && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 h-[2px] w-[20%]"
            style={{
              transform: `translateX(calc(var(--painel-tab-progress, ${progressoPadrao}) * 100%))`,
              willChange: "transform",
            }}
          >
            <span
              className="mx-auto block h-full w-[64%]"
              style={{
                background: "var(--color-accent)",
                boxShadow: "0 0 10px rgba(194, 168, 117, 0.45)",
                borderRadius: "0 0 2px 2px",
              }}
            />
          </div>
        )}

        {[...SECOES, { href: "/painel/conta", rotulo: "Conta", icone: IconeConta }].map(
          ({ href, rotulo, icone: Icone }) => {
            const ativo = estaAtivo(href, rotaAtiva);
            const carregandoEstaAba = otimista === href && otimista !== atual;

            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={(e) => handleNavegar(e, href)}
                aria-current={ativo ? "page" : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors"
                style={{
                  minHeight: 56,
                  color: ativo ? "var(--color-accent)" : "var(--color-muted)",
                }}
              >
                {/* Gatilho físico da Taptic Engine no iPhone (acionado pelo toque direto do polegar) */}
                <input
                  type="checkbox"
                  aria-hidden="true"
                  tabIndex={-1}
                  {...({ switch: "" } as any)}
                  className="absolute inset-0 z-10 h-full w-full opacity-0 cursor-pointer"
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                  onClick={(e) => handleNavegar(e, href)}
                />

                {!estaNoShell && ativo && (
                  <motion.span
                    layoutId={reduceMotion ? undefined : "painel-nav-indicator"}
                    aria-hidden
                    className="absolute inset-x-[18%] top-0 h-[2px]"
                    style={{
                      background: "var(--color-accent)",
                      boxShadow: "0 0 10px rgba(194, 168, 117, 0.45)",
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
                    layoutId={reduceMotion ? undefined : "painel-nav-backdrop"}
                    aria-hidden
                    className="absolute inset-1.5 -z-10 rounded-lg"
                    style={{
                      background: "rgba(194, 168, 117, 0.08)",
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
                      style={{ background: "var(--color-accent)" }}
                    />
                  )}
                </span>
              </Link>
            );
          },
        )}
      </nav>
    </>
  );
}

const svg = {
  viewBox: "0 0 24 24",
  className: "h-4 w-4 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconeClientes() {
  return (
    <svg {...svg}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 11a3 3 0 1 0-1.5-5.6" />
      <path d="M17 19a5.4 5.4 0 0 0-1.6-3.9" />
    </svg>
  );
}

function IconeDashboard() {
  return (
    <svg {...svg}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function IconeNegociacoes() {
  return (
    <svg {...svg}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}

function IconePecas() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="13" r="6.2" />
      <path d="M12 10v3l2 1.5" />
      <path d="M9.5 3.5h5" />
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

function Monograma() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.96 16.7 8.22 7.9l3.26 8.8 2.15-5.8 2.15 5.8 3.26-8.8" />
      <path d="M6.11 13.6h4.22" />
    </svg>
  );
}