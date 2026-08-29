/**
 * SPEC §1.4 — rodapé: autoridade, transparência e compliance.
 *
 * Três coisas precisam estar aqui sem concessão:
 * 1. Afiliação zero com as marcas anunciadas (disclaimer legal obrigatório);
 * 2. Canal real de contato (WhatsApp oficial da casa: +55 42 98870-6221);
 * 3. CNPJ / ano / presença em São Paulo.
 */

import Link from "next/link";
import { contactHref } from "@/components/contact/WhatsappCta";

const INSTAGRAM_URL = "https://instagram.com/andrewatchesbr";

const FOOTER_NAV = [
  {
    title: "Acervo",
    links: [
      { href: "/acesso", label: "Entrar ou pedir acesso" },
      { href: "/sobre", label: "A casa" },
    ],
  },
  {
    title: "Negociar",
    links: [
      { href: "/vender", label: "Vender seu relógio" },
      { href: "/vender#troca", label: "Troca" },
      { href: "/vender#consignacao", label: "Consignação" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { href: "/privacidade", label: "Privacidade" },
      { href: "/termos", label: "Termos de uso" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="border-t print:hidden"
      style={{
        borderColor: "var(--color-border)",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[2fr_3fr]">
          <div className="flex flex-col gap-4">
            <Link href="/" className="label">
              Andre<span style={{ color: "var(--color-accent)" }}> · </span>Watches
            </Link>
            <p className="max-w-sm text-sm leading-relaxed">
              Relógios de luxo desde 2012. Compra, venda, troca e consignação —
              somente peças originais, com procedência conferida uma a uma.
            </p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <a
                href={contactHref("Vim pelo site e gostaria de falar com a casa.")}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline font-medium flex items-center gap-1.5"
              >
                <span>WhatsApp: +55 42 98870-6221</span>
                <span>↗</span>
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:underline opacity-80"
              >
                Instagram: @andrewatchesbr
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
            {FOOTER_NAV.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h3 className="label">{col.title}</h3>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* SPEC §1.4 — disclaimer obrigatório de mercado secundário. */}
        <p
          className="mt-16 max-w-3xl border-t pt-8 text-xs leading-relaxed"
          style={{ borderColor: "var(--color-border)" }}
        >
          A Andre Watches é uma revendedora independente do mercado secundário.
          Não somos revendedor autorizado nem temos vínculo com Rolex, Cartier,
          Audemars Piguet, Omega ou qualquer outra fabricante. As marcas citadas
          pertencem a seus respectivos titulares e são usadas apenas para
          identificar as peças anunciadas.
        </p>

        <div className="mt-8 flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between">
          <span className="meta">© {year} Andre Watches</span>
          <span className="meta">
            Atendimento por WhatsApp (+55 42 98870-6221) · envio segurado para todo o Brasil
          </span>
        </div>
      </div>
    </footer>
  );
}