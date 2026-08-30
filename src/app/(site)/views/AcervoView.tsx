"use client";

import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { ModalEncomenda } from "@/components/collection/ModalEncomenda";
import { BarraPrevia } from "@/components/layout/BarraPrevia";
import { AccessVisitRecorder } from "../acervo/AccessVisitRecorder";
import { AcervoScrollTop } from "../acervo/AcervoScrollTop";
import { ModalBoasVindas } from "../acervo/ModalBoasVindas";
import type { Watch } from "@/lib/types";

interface AcervoViewProps {
  isAdmin: boolean;
  cliente: { nome: string; email: string; telefone: string } | null;
  pecas: Watch[];
  saudacao: string;
  boasVindas: boolean;
}

export function AcervoView({
  isAdmin,
  cliente,
  pecas,
  saudacao,
  boasVindas,
}: AcervoViewProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      {isAdmin && <BarraPrevia />}
      {cliente && !isAdmin && <AccessVisitRecorder />}
      <AcervoScrollTop />
      <ModalBoasVindas nome={cliente?.nome ?? ""} ativo={boasVindas} />
      <header className="flex max-w-4xl flex-col gap-6">
        <h1
          className="text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            lineHeight: 0.98,
            letterSpacing: "-0.03em",
          }}
        >
          {saudacao}
        </h1>
        <p
          className="max-w-xl text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          {cliente
            ? "Acervo privado e personalizado para você."
            : "Esta é a página que o cliente ativo enxerga."}
        </p>
      </header>

      <section className="mt-20" aria-labelledby="catalogo-title">
        <h2 id="catalogo-title" className="sr-only">
          Peças no acervo
        </h2>
        <CollectionGrid watches={pecas} />
        <ModalEncomenda />
      </section>
    </section>
  );
}
