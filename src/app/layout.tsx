import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <Header />
          <div className="relative z-10">
            <main id="main">{children}</main>
            <Footer />
          </div>
        </SmoothScroll>
      </body>
    </html>
  );
}
