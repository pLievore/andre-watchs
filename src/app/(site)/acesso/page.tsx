import type { Metadata } from "next";

import { WhatsappCta } from "@/components/contact/WhatsappCta";
import { destinoSeguroAposLogin } from "@/lib/rotas";

import { AccessForms } from "./AccessForms";

export const metadata: Metadata = {
  title: "Acesso",
  description: "Área reservada aos clientes da Andre Watches.",
  // O acervo é privado; não faz sentido indexar a porta dele.
  robots: { index: false, follow: false },
};

export default async function AcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; estado?: string }>;
}) {
  const { destino, estado } = await searchParams;

  return (
    <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 py-32 md:py-40">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Área reservada</p>
        <h1
          className="text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 6vw, 2.75rem)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          O acervo é para clientes da casa.
        </h1>
        <p
          className="mt-1 text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          As peças não são anunciadas publicamente. Se você já tem acesso, entre.
          Se ainda não, peça — a casa avalia cada pedido.
        </p>
      </div>

      <div className="mt-10">
        <AccessForms
          destino={destinoSeguroAposLogin(destino)}
          estadoInicial={estado}
        />
      </div>

      {/*
        Saída para quem não consegue entrar. Sem isto, a alternativa do cliente
        é desistir — e num clube de poucos, cada um importa.
      */}
      <div
        className="mt-12 border-t pt-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--color-muted)" }}>
          Problema para entrar? Fale direto com a casa.
        </p>
        <WhatsappCta
          variant="secondary"
          label="Falar com a casa"
          context="Olá! Estou com dificuldade para acessar o acervo no site."
        />
      </div>
    </section>
  );
}
