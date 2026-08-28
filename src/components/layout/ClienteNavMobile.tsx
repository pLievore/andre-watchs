"use client";

/**
 * Barra inferior do cliente — a navegação recorrente fica ao alcance do
 * polegar, como no painel da casa. O header continua sendo a assinatura da
 * marca; no celular autenticado ele não precisa esconder quatro destinos
 * atrás de um menu sanduíche.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESTINOS = [
  { href: "/acervo", rotulo: "Acervo", icone: IconeAcervo },
  { href: "/vender", rotulo: "Vender", icone: IconeVender },
  { href: "/sobre", rotulo: "A casa", icone: IconeCasa },
  { href: "/acervo/conta", rotulo: "Conta", icone: IconeConta },
] as const;

function estaAtivo(href: string, atual: string) {
  if (href === "/acervo/conta") return atual.startsWith(href);
  if (href === "/acervo") {
    return (
      atual === href ||
      (atual.startsWith(`${href}/`) && !atual.startsWith("/acervo/conta"))
    );
  }
  return atual === href || atual.startsWith(`${href}/`);
}

export function ClienteNavMobile() {
  const atual = usePathname();

  return (
    <nav
      aria-label="Navegação do cliente"
      className="fixed inset-x-0 bottom-0 z-50 flex border-t md:hidden"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-background)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {DESTINOS.map(({ href, rotulo, icone: Icone }) => {
        const ativo = estaAtivo(href, atual);
        return (
          <Link
            key={href}
            href={href}
            aria-current={ativo ? "page" : undefined}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-colors duration-200"
            style={{
              minHeight: 58,
              color: ativo ? "var(--color-foreground)" : "var(--color-muted)",
              transitionTimingFunction: "var(--ease-editorial)",
            }}
          >
            {ativo && (
              <span
                aria-hidden
                className="absolute inset-x-[28%] top-0 h-px"
                style={{ background: "var(--color-foreground)" }}
              />
            )}
            <Icone />
            <span style={{ fontSize: "0.7rem" }}>{rotulo}</span>
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
