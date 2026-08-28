import type { Metadata } from "next";

import { WhatsappCta } from "@/components/contact/WhatsappCta";
import { AmbientVideo } from "@/components/media/AmbientVideo";

export const metadata: Metadata = {
  title: "A casa",
  description:
    "Andre Watches: relógios de luxo desde 2012. Como a procedência de cada peça é conferida antes de entrar no acervo.",
};

/** SPEC §10 — LocalBusiness/Store nesta página. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Andre Watches",
  description:
    "Compra, venda, troca e consignação de relógios de luxo do mercado secundário desde 2012.",
  sameAs: ["https://instagram.com/andrewatchesbr"],
  areaServed: "BR",
};

const STEPS = [
  {
    n: "01",
    title: "Entrada",
    body: "A peça chega por compra direta, troca ou consignação. Antes de qualquer conversa de preço, ela é aberta, medida e comparada com a referência de fábrica.",
  },
  {
    n: "02",
    title: "Conferência",
    body: "Número de série e referência, calibre, acabamento de caixa e pulseira, encaixe do fecho, funcionamento das complicações e o que acompanha — caixa, cartão, manuais e selo.",
  },
  {
    n: "03",
    title: "Registro",
    body: "O que foi conferido vira a ficha da peça no site. O que não pôde ser confirmado entra como travessão, não como suposição.",
  },
  {
    n: "04",
    title: "Entrega",
    body: "Conferência presencial ou por vídeo com o comprador, pagamento acertado direto com a casa e envio segurado para todo o Brasil.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
        <p className="eyebrow">A casa</p>
        <h1
          className="mt-6 text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            lineHeight: 0.96,
            letterSpacing: "-0.03em",
          }}
        >
          Desde 2012, na mesma mesa.
        </h1>

        <div
          className="mt-10 flex max-w-2xl flex-col gap-6 text-lg leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          <p>
            A Andre Watches trabalha com relógios de luxo há mais de uma década:
            compra, venda, troca e consignação. A casa só anuncia o que
            conhece, peça por peça.
          </p>
          <p>
            Não existe catálogo infinito nem estoque de terceiro anunciado às
            cegas. Cada relógio que aparece aqui passou pelas mãos da casa antes
            de aparecer na sua tela.
          </p>
        </div>

        {/* ⚠️ DEMO: foto do Unsplash, não é o acervo da casa (ver watches.ts). */}
        <figure className="mt-16">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden border"
            style={{ borderColor: "var(--color-border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pecas/acervo-caixa.webp"
              alt="Caixa de relógios aberta com várias peças guardadas lado a lado"
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <figcaption className="meta mt-3">
            Cada peça é conferida antes de entrar no acervo.
          </figcaption>
        </figure>

        <section className="mt-24" aria-labelledby="process-title">
          <h2
            id="process-title"
            className="mb-12"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
          >
            Como a procedência é conferida.
          </h2>

          {/*
           * Painel de ofício ao lado dos passos. O material é retrato (480x854),
           * então ganha uma coluna vertical em vez de ser recortado — e é
           * exatamente o que o texto descreve: a peça aberta e conferida.
           * Sticky no desktop: acompanha a leitura dos quatro passos.
           */}
          <div className="grid gap-10 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-16">
            <div className="md:sticky md:top-32 md:self-start">
              <AmbientVideo
                src="/oficio.mp4"
                poster="/oficio-poster.jpg"
                label="Detalhes em macro de uma peça aberta na bancada: gravação do fecho, índices aplicados e acabamento da caixa"
              />
              <p
                className="mt-4 label"
              >
                Na bancada
              </p>
            </div>

            <ol
              className="flex flex-col divide-y border-y"
              style={{ borderColor: "var(--color-border)" }}
            >
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="grid gap-4 py-8 md:grid-cols-[auto_1fr] md:gap-8"
              >
                <span
                  className="meta"
                  style={{
                    color: "var(--color-accent)",
                  }}
                >
                  {step.n}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.5rem",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{ color: "var(--color-muted)" }}
                >
                  {step.body}
                </p>
              </li>
              ))}
            </ol>
          </div>
        </section>

        {/* SPEC §1.4 — o disclaimer também aparece no corpo, não só no rodapé. */}
        <section
          className="mt-24 border p-8 md:p-10"
          style={{ borderColor: "var(--color-border)" }}
          aria-labelledby="disclaimer-title"
        >
          <h2
            id="disclaimer-title"
            className="label"
          >
            Mercado secundário
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed">
            A Andre Watches é uma revendedora independente. Não somos revendedor
            autorizado nem temos qualquer vínculo, representação ou parceria com
            Rolex, Cartier, Audemars Piguet, Omega ou outras fabricantes. As
            marcas citadas pertencem a seus respectivos titulares e são usadas
            apenas para identificar as peças anunciadas. Toda garantia de
            fabricante, quando existir, é a do cartão que acompanha a peça.
          </p>
        </section>

        <div className="mt-16">
          <WhatsappCta
            variant="primary"
            label="Falar com a casa"
            context="Vim pela página 'A casa' e gostaria de conversar."
          />
        </div>
      </article>
    </>
  );
}
