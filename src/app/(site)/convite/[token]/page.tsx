import type { Metadata } from "next";
import Link from "next/link";

import { dbAdmin } from "@/lib/db/admin";
import { FormConvite } from "./FormConvite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convite para o Acervo",
  description: "Ative seu convite exclusivo para acessar o acervo privado Andre Watches.",
  robots: { index: false, follow: false },
};

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: convite } = await dbAdmin
    .from("convites")
    .select("id, token, nome_sugerido, criado_por, expira_em, usado_em")
    .eq("token", token)
    .maybeSingle();

  if (!convite) {
    return (
      <section className="mx-auto max-w-xl px-6 py-32 md:py-44">
        <span className="eyebrow">Andre Watches</span>
        <h1
          className="mt-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Convite não encontrado
        </h1>
        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          O endereço informado não confere com nenhum convite emitido pela
          casa. Se você recebeu este convite recentemente, confirme se o link
          foi copiado por completo.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-ghost">
            Início
          </Link>
          <Link href="/acesso" className="btn btn-primary">
            Solicitar acesso
          </Link>
        </div>
      </section>
    );
  }

  if (convite.usado_em) {
    return (
      <section className="mx-auto max-w-xl px-6 py-32 md:py-44">
        <span className="eyebrow">Andre Watches</span>
        <h1
          className="mt-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Convite já utilizado
        </h1>
        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          Este convite pessoal já foi resgatado e a conta correspondente já
          possui acesso ativo ao acervo privado.
        </p>
        <div className="mt-8">
          <Link href="/acesso" className="btn btn-primary">
            Entrar no acervo
          </Link>
        </div>
      </section>
    );
  }

  if (new Date(convite.expira_em) < new Date()) {
    return (
      <section className="mx-auto max-w-xl px-6 py-32 md:py-44">
        <span className="eyebrow">Andre Watches</span>
        <h1
          className="mt-4"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Convite expirado
        </h1>
        <p
          className="mt-4 text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          Este convite pessoal possuía validade de 7 dias e já expirou. Para
          receber um novo convite, contate diretamente a casa ou solicite seu
          acesso.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-ghost">
            Início
          </Link>
          <Link href="/acesso" className="btn btn-primary">
            Pedir acesso
          </Link>
        </div>
      </section>
    );
  }

  const saudacaoTitulo = convite.nome_sugerido
    ? `Bem-vindo, ${convite.nome_sugerido}.`
    : "Bem-vindo ao acervo reservado.";

  return (
    <section className="mx-auto max-w-xl px-6 py-28 md:py-40">
      <span className="eyebrow">Convite pessoal</span>
      <h1
        className="mt-4 text-balance"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {saudacaoTitulo}
      </h1>
      <p
        className="mt-4 text-base leading-relaxed"
        style={{ color: "var(--color-muted)" }}
      >
        A casa disponibilizou este acesso pessoal exclusivo para você. Ative sua
        conta abaixo para visualizar o acervo completo e as cotações das peças.
      </p>

      <FormConvite token={token} nomeSugerido={convite.nome_sugerido} />
    </section>
  );
}