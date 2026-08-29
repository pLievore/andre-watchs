"use client";

import Link from "next/link";
import { sair } from "@/app/(site)/acesso/actions";
import { WhatsappCta } from "@/components/contact/WhatsappCta";
import { ContaForms } from "../acervo/conta/ContaForms";

interface ClienteContaViewProps {
  cliente: {
    nome: string;
    email: string;
    telefone: string;
  } | null;
  isAdmin: boolean;
}

export function ClienteContaView({ cliente, isAdmin }: ClienteContaViewProps) {
  if (!cliente) {
    if (isAdmin) {
      return (
        <section className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
          <header className="flex flex-col gap-3">
            <p className="eyebrow">Acesso do Operador</p>
            <h1
              className="text-balance"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 5vw, 3.25rem)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              Painel do Administrador
            </h1>
            <p className="meta mt-2">
              Você está conectado com privilégios administrativos.
            </p>
          </header>

          <div className="mt-10">
            <Link
              href="/painel"
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <span>Abrir Painel Administrativo</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      );
    }

    return (
      <section className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
        <header className="flex flex-col gap-3">
          <p className="eyebrow">Identificação</p>
          <h1
            className="text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Acesso ao Clube
          </h1>
          <p className="meta mt-2">
            Identifique-se para visualizar seus dados e relógios salvos.
          </p>
        </header>

        <div className="mt-10">
          <Link
            href="/acesso"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <span>Entrar com e-mail</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <header className="flex flex-col gap-3">
        <p className="eyebrow">Minha conta</p>
        <h1
          className="text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {cliente.nome}
        </h1>
      </header>

      <div className="mt-14">
        <ContaForms
          cliente={{
            nome: cliente.nome,
            telefone: cliente.telefone,
            email: cliente.email,
          }}
        />
      </div>

      <div
        className="mt-14 flex flex-col gap-10 border-t pt-10"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <h2 className="label">Negociar</h2>
          <p
            className="mt-3 max-w-md text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            Quer vender, trocar ou deixar uma peça em consignação? A avaliação
            começa numa conversa.
          </p>
          <Link href="/vender" className="link-quiet mt-4 inline-block text-sm">
            Vender ou trocar um relógio <span aria-hidden>→</span>
          </Link>
        </div>

        <div>
          <h2 className="label">Precisa de ajuda?</h2>
          <div className="mt-4">
            <WhatsappCta
              variant="secondary"
              label="Falar com a casa"
              context={`Olá! Sou cliente (${cliente.nome}) e preciso de ajuda com meu acesso.`}
            />
          </div>
        </div>

        <form action={sair}>
          <button
            type="submit"
            className="label link-quiet"
            style={{ color: "var(--color-muted)" }}
          >
            Sair da conta
          </button>
        </form>
      </div>
    </section>
  );
}
