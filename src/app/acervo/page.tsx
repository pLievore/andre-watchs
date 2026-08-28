import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CollectionGrid } from "@/components/collection/CollectionGrid";
import {
  contarPecasDesde,
  listarPecasDoCliente,
} from "@/lib/db/pecas-sessao";
import { clienteAtual } from "@/lib/db/server";
import { montarSaudacao } from "@/lib/saudacao";

import { AccessVisitRecorder } from "./AccessVisitRecorder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acervo",
  description: "Acervo reservado aos clientes da Andre Watches.",
  robots: { index: false, follow: false },
};

const DIA_MS = 24 * 60 * 60 * 1000;

function diasDesde(valor: string | null, agora: Date): number | null {
  if (!valor) return null;
  const instante = Date.parse(valor);
  if (Number.isNaN(instante)) return null;
  return Math.max(0, Math.floor((agora.getTime() - instante) / DIA_MS));
}

function horaEmSaoPaulo(agora: Date): number {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).format(agora);
  return Number.parseInt(hora, 10);
}

export default async function AcervoPage() {
  // O middleware faz a primeira barreira; esta checagem mantém a página segura
  // mesmo se ela for chamada por outro caminho no futuro. O RLS é a terceira.
  const cliente = await clienteAtual();
  if (!cliente || cliente.status !== "ativo") redirect("/acesso");

  const [pecas, pecasNovas] = await Promise.all([
    listarPecasDoCliente(),
    contarPecasDesde(cliente.ultimo_acesso),
  ]);

  const agora = new Date();
  const saudacao = montarSaudacao({
    nome: cliente.nome,
    primeiraVisita: cliente.ultimo_acesso === null,
    pecasNovas,
    diasAusente: diasDesde(cliente.ultimo_acesso, agora),
    hora: horaEmSaoPaulo(agora),
  });

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <AccessVisitRecorder />

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
          Acervo privado e personalizado para você.
        </p>
      </header>

      <section className="mt-20" aria-labelledby="catalogo-title">
        <h2 id="catalogo-title" className="sr-only">
          Peças no acervo
        </h2>
        <CollectionGrid watches={pecas} />
      </section>
    </section>
  );
}
