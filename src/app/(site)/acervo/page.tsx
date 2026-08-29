import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CollectionGrid } from "@/components/collection/CollectionGrid";
import { ModalEncomenda } from "@/components/collection/ModalEncomenda";
import { BarraPrevia } from "@/components/layout/BarraPrevia";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import {
  contarPecasDesde,
  listarPecasDoCliente,
} from "@/lib/db/pecas-sessao";
import { clienteAtual } from "@/lib/db/server";
import { montarSaudacao } from "@/lib/saudacao";

import { AccessVisitRecorder } from "./AccessVisitRecorder";
import { ModalBoasVindas } from "./ModalBoasVindas";

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

export default async function AcervoPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const boasVindas =
    params?.["boas-vindas"] === "1" || params?.convite === "1";

  // O middleware faz a primeira barreira; esta checagem mantém a página segura
  // mesmo se ela for chamada por outro caminho no futuro. O RLS é a terceira.
  // O dono vê a própria vitrine. Ele não tem linha em `clientes`, então a
  // checagem de cliente ativo não se aplica — e recusá-lo aqui deixaria o
  // Andre sem nenhuma forma de conferir o que publicou.
  const admin = await usuarioAdmin();
  const cliente = await clienteAtual();
  if (!admin && (!cliente || cliente.status !== "ativo")) redirect("/acesso");

  const [pecas, pecasNovas] = await Promise.all([
    listarPecasDoCliente(),
    cliente ? contarPecasDesde(cliente.ultimo_acesso) : Promise.resolve(0),
  ]);

  const agora = new Date();
  // Saudação é peça de relacionamento com o cliente. Para o dono ela seria
  // teatro — ele sabe quem é.
  const saudacao = cliente
    ? montarSaudacao({
        nome: cliente.nome,
        primeiraVisita: cliente.ultimo_acesso === null,
        pecasNovas,
        diasAusente: diasDesde(cliente.ultimo_acesso, agora),
        hora: horaEmSaoPaulo(agora),
      })
    : "O acervo da casa.";

  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      {admin && <BarraPrevia />}
      {/* Visita do dono não conta como acesso de cliente — sujaria o registro. */}
      {cliente && !admin && <AccessVisitRecorder />}
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
