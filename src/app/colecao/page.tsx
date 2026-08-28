import type { Metadata } from "next";

import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { listarPecas } from "@/lib/db/pecas";

export const metadata: Metadata = {
  title: "Acervo",
  description:
    "Relógios de luxo disponíveis na Andre Watches. Rolex e outras maisons premium do mercado secundário, com referência, condição e o que acompanha declarados peça a peça.",
};

export default async function CollectionPage() {
  const pecas = await listarPecas();

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <header className="flex flex-col gap-6">
        <p className="eyebrow">Acervo</p>
        <h1
          className="max-w-3xl text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
          }}
        >
          Cada peça, com o que se sabe dela.
        </h1>
        <p
          className="max-w-xl text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          Referência, condição e o que acompanha vêm declarados. O que a casa
          ainda não confirmou aparece como <span aria-label="dado ausente">—</span>,
          nunca como suposição.
        </p>
      </header>

      <CollectionGrid watches={pecas} />
    </section>
  );
}
