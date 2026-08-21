/**
 * Header global — fixo no topo, fundo preto sólido, sempre visível.
 *
 * SPEC §7: nesta fase não há sacola. O CTA de canto é o WhatsApp, que é como
 * a casa converte hoje. Carrinho entra na fase E.
 */

import Link from "next/link";

import { WhatsappCta } from "@/components/contact/WhatsappCta";

const NAV_LINKS = [
  { href: "/colecao", label: "Acervo" },
  { href: "/vender", label: "Vender" },
  { href: "/sobre", label: "A casa" },
] as const;

export function Header() {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b"
      style={{
        color: "var(--color-foreground)",
        background: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
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
          >
            Andre<span style={{ color: "var(--color-accent)" }}> · </span>Watches
          </span>
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-10 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="label underline-offset-8 hover:underline"
            >
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
    </header>
  );
}

/**
 * Monograma "A" em traços de display digital, ecoando o avatar do Instagram.
 * Desenhado em SVG para escalar sem asset e herdar a cor do acento.
 */
function Monogram() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-7 w-7 shrink-0"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="1.6"
      strokeLinecap="square"
    >
      <circle cx="12" cy="12" r="11" strokeWidth="0.8" opacity="0.5" />
      <path d="M8 17V9.5L12 6l4 3.5V17" />
      <path d="M8 12.6h8" />
    </svg>
  );
}
