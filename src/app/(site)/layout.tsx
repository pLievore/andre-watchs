import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NavigationProgressBar } from "@/components/layout/NavigationProgressBar";
import { GatilhoTatil } from "@/components/layout/GatilhoTatil";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { clienteAtual } from "@/lib/db/server";

import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://andrewatches.com.br"),
  title: {
    default: "ANDRE WATCHES — Relógios de luxo, somente originais",
    template: "%s · ANDRE WATCHES",
  },
  description:
    "Compra, venda, troca e consignação de relógios de luxo desde 2012. Rolex e outras maisons premium do mercado secundário, com procedência conferida peça a peça.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ANDRE WATCHES",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O header muda para o dono: ele vê "Painel" e "Acervo", não "Entrar".
  const [cliente, admin] = await Promise.all([clienteAtual(), usuarioAdmin()]);
  const ehAdmin = admin !== null;
  const temBarraMobile = cliente?.status === "ativo" || ehAdmin;

  return (
    <html lang="pt-BR">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-[var(--color-foreground)] focus:text-[var(--color-background)] focus:px-4 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        <SmoothScroll>
          <NavigationProgressBar cor="var(--color-foreground)" />
          <Header
            isClienteAtivo={cliente?.status === "ativo"}
            isAdmin={ehAdmin}
          />
          <div
            className={`relative z-10 ${
              temBarraMobile ? "pb-20 md:pb-0" : ""
            }`}
          >
            <main id="main" className="overflow-x-clip">{children}</main>
            <Footer />
          </div>
        </SmoothScroll>
        <GatilhoTatil />
        <Analytics />
      </body>
    </html>
  );
}
