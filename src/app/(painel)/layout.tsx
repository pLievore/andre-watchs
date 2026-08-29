import type { Metadata, Viewport } from "next";

import "./painel.css";

/**
 * Layout RAIZ do painel — irmão do layout da vitrine, não filho.
 *
 * O painel é outro produto: ferramenta de trabalho, usada todo dia, por uma
 * pessoa que quer terminar rápido e sair. Herdar a casca do site trazia o
 * header da vitrine, o rodapé com disclaimer e — pior — o **Lenis**. Scroll
 * suave num painel é ativamente ruim: quem trabalha com tabela quer que a
 * rolagem obedeça ao dedo na hora.
 *
 * Route Groups do Next permitem dois layouts raiz irmãos: `(site)` e `(painel)`
 * não compartilham nada além do CSS de tokens.
 */

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel · Andre Watches" },
  // Área interna nunca é indexada.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#12100e",
  width: "device-width",
  initialScale: 1,
};

export default function PainelRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="painel">
      <body>
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--color-foreground)] focus:px-4 focus:py-2 focus:text-[var(--color-background)]"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
