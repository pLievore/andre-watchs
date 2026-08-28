"use client";

/**
 * Navegação do painel.
 *
 * Duas formas, mesma fonte de verdade:
 *  - **desktop**: barra lateral fixa, sempre visível. Quem trabalha o dia
 *    inteiro não deve precisar abrir menu para trocar de seção.
 *  - **celular**: barra inferior, ao alcance do polegar. O Andre usa em pé,
 *    muitas vezes com uma peça na outra mão — navegação no topo obrigaria a
 *    reposicionar a mão a cada troca.
 *
 * Sem menu sanduíche: são quatro seções, cabem à vista. Esconder navegação atrás
 * de um toque só se justifica quando ela não cabe.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { sairDoPainel } from "@/app/(painel)/painel/entrar/actions";

const SECOES = [
  { href: "/painel", rotulo: "Pedidos", icone: IconePedidos },
  { href: "/painel/clientes", rotulo: "Clientes", icone: IconeClientes },
  { href: "/painel/pecas", rotulo: "Peças", icone: IconePecas },
] as const;

/** Ativo por prefixo, mas `/painel` só no exato — senão acende em tudo. */
function estaAtivo(href: string, atual: string) {
  return href === "/painel" ? atual === href : atual.startsWith(href);
}

export function PainelNav({ email }: { email: string }) {
  const atual = usePathname();

  return (
    <>
      {/* ── Desktop: lateral fixa ────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r md:flex"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div
          className="flex items-center gap-2.5 border-b px-5 py-5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <Monograma />
          <span className="label" style={{ color: "var(--color-foreground)" }}>
            Painel
          </span>
        </div>

        <nav aria-label="Seções do painel" className="flex flex-1 flex-col gap-1 p-3">
          {SECOES.map(({ href, rotulo, icone: Icone }) => {
            const ativo = estaAtivo(href, atual);
            return (
              <Link
                key={href}
                href={href}
                aria-current={ativo ? "page" : undefined}
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-200"
                style={{
                  background: ativo ? "var(--color-surface-2)" : "transparent",
                  color: ativo
                    ? "var(--color-foreground)"
                    : "var(--color-muted)",
                  // A barra à esquerda dá a forma do estado ativo, para não
                  // depender só de cor.
                  boxShadow: ativo
                    ? "inset 2px 0 0 0 var(--color-accent)"
                    : "none",
                }}
              >
                <Icone />
                {rotulo}
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
          // Não fica embaixo da barra de gestos do iPhone.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {[...SECOES, { href: "/painel/conta", rotulo: "Conta", icone: IconeConta }].map(({ href, rotulo, icone: Icone }) => {
          const ativo = estaAtivo(href, atual);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
              style={{
                minHeight: 56,
                color: ativo ? "var(--color-accent)" : "var(--color-muted)",
              }}
            >
              <Icone />
              <span style={{ fontSize: "0.7rem" }}>{rotulo}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

/* Ícones desenhados aqui: são cinco traços cada, e uma dependência de biblioteca
   custaria mais que o próprio painel. Todos herdam `currentColor`. */

const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function IconePedidos() {
  return (
    <svg {...svg}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

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
