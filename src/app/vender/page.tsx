import type { Metadata } from "next";

import { SellForm } from "@/components/contact/SellForm";

export const metadata: Metadata = {
  title: "Vender, trocar ou consignar",
  description:
    "A Andre Watches compra, aceita em troca e recebe em consignação relógios de luxo. Envie os dados da peça e receba uma avaliação.",
};

const MODES = [
  {
    id: "venda",
    title: "Venda direta",
    body: "A casa compra a peça. Você recebe uma proposta depois da avaliação e o pagamento sai na hora do fechamento, sem esperar comprador.",
  },
  {
    id: "troca",
    title: "Troca",
    body: "Sua peça entra como parte do pagamento de outra do acervo. A diferença é acertada dos dois lados, com as duas avaliações abertas.",
  },
  {
    id: "consignacao",
    title: "Consignação",
    body: "A peça continua sua e fica no acervo da casa até vender. Você combina o valor mínimo antes, e a peça é anunciada com a mesma ficha de qualquer outra.",
  },
] as const;

export default function SellPage() {
  return (
    <article className="mx-auto max-w-5xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <p className="eyebrow">Vender · Trocar · Consignar</p>
      <h1
        className="mt-6 max-w-3xl text-balance"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
          lineHeight: 0.96,
          letterSpacing: "-0.03em",
        }}
      >
        A casa também compra.
      </h1>
      <p
        className="mt-8 max-w-2xl text-lg leading-relaxed"
        style={{ color: "var(--color-muted)" }}
      >
        Cada negociação começa pela mesma pergunta: o que se sabe, de fato,
        sobre este relógio. Envie os dados da sua peça e a avaliação começa
        numa conversa direta com a casa.
      </p>

      <section className="mt-24" aria-labelledby="modes-title">
        <h2 id="modes-title" className="sr-only">
          Formas de negociar
        </h2>
        <ul
          className="flex flex-col divide-y border-y"
          style={{ borderColor: "var(--color-border)" }}
        >
          {MODES.map((mode) => (
            <li
              key={mode.id}
              id={mode.id}
              className="grid gap-4 py-8 md:grid-cols-[1fr_2fr] md:gap-10"
            >
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.5rem",
                  letterSpacing: "-0.01em",
                }}
              >
                {mode.title}
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: "var(--color-muted)" }}
              >
                {mode.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-24" aria-labelledby="form-title">
        <h2
          id="form-title"
          className="mb-10"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 3rem)",
            letterSpacing: "-0.02em",
          }}
        >
          Conta da peça.
        </h2>
        <SellForm />
      </section>
    </article>
  );
}
