import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { sair } from "@/app/acesso/actions";
import { WhatsappCta } from "@/components/contact/WhatsappCta";
import { clienteAtual } from "@/lib/db/server";

import { ContaForms } from "./ContaForms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minha conta",
  description: "Dados de acesso e contato na Andre Watches.",
  robots: { index: false, follow: false },
};

export default async function ContaPage() {
  // Mesma checagem defensiva de /acervo: o middleware é a primeira barreira,
  // esta mantém a página segura se um dia for chamada por outro caminho.
  const cliente = await clienteAtual();
  if (!cliente || cliente.status !== "ativo") redirect("/acesso");

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
            telefone: cliente.telefone ?? "",
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
