import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";
import { destinoSeguroAposLogin } from "@/lib/rotas";

import { EntrarForm } from "./EntrarForm";

export const metadata: Metadata = {
  title: "Entrar",
  // A porta da administração não se anuncia.
  robots: { index: false, follow: false },
};

export default async function EntrarNoPainelPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  // Já autenticado não fica olhando tela de login.
  if (await usuarioAdmin()) redirect("/painel");

  const { destino } = await searchParams;

  return (
    <main
      id="conteudo"
      className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]"
      style={{ background: "var(--color-background)" }}
    >
      {/*
        Coluna do formulário primeiro no DOM: quem chega aqui tem uma tarefa
        só, e no celular a imagem não pode empurrar o campo de e-mail para
        baixo da dobra.
      */}
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 lg:px-16 lg:py-14">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <Monograma />
          <span className="label" style={{ color: "var(--color-foreground)" }}>
            Andre Watches
          </span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-col gap-8 py-14">
          <div className="flex flex-col gap-3">
            <p className="eyebrow">Administração</p>
            <h1
              className="text-balance"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              A casa por dentro.
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-muted)" }}
            >
              Acervo, clientes e pedidos de acesso. Entrada restrita à casa.
            </p>
          </div>

          <EntrarForm destino={destinoSeguroAposLogin(destino, "/painel")} />
        </div>

        {/*
          A saída para a área de cliente fica explícita. Sem isto, um cliente
          que guardou o endereço errado nos favoritos bate numa porta que não
          é a dele e não tem para onde ir.
        */}
        <p className="meta">
          É cliente da casa?{" "}
          <Link href="/acesso" className="link-quiet">
            O acervo fica aqui →
          </Link>
        </p>
      </div>

      {/*
        A peça. Só no desktop: em tela pequena ela roubaria a altura toda do
        formulário para entregar decoração.
      */}
      <div className="relative hidden lg:block">
        <Image
          src="/brand/acesso-painel.webp"
          alt="Rolex Submariner em aço, mostrador preto com índices dourados, em três quartos sob luz de estúdio"
          fill
          sizes="55vw"
          priority
          className="object-cover"
        />
        {/*
          Véu curto na borda esquerda: a foto tem fundo claro e o painel é
          escuro, então sem isto a emenda entre os dois vira um corte duro.
        */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, var(--color-background) 0%, transparent 18%)",
          }}
        />
      </div>
    </main>
  );
}

function Monograma() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="var(--color-accent)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.96 16.7 8.22 7.9l3.26 8.8 2.15-5.8 2.15 5.8 3.26-8.8" />
      <path d="M6.11 13.6h4.22" />
    </svg>
  );
}
