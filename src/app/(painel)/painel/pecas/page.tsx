import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { formatPrice } from "@/lib/format";

import { SeletorEstado, type Estado } from "./SeletorEstado";

export const metadata: Metadata = { title: "Peças" };

interface LinhaLista {
  slug: string;
  marca: string;
  modelo: string;
  referencia: string | null;
  preco_centavos: number;
  estado: Estado;
  consignada: boolean;
  fotos: { count: number }[];
}

export default async function PainelPecasPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  // Disponíveis primeiro, depois em negociação, depois vendidas: é a ordem em
  // que o Andre pensa no estoque. A ordem do enum já entrega isso.
  const { data } = await dbAdmin
    .from("pecas")
    .select(
      "slug, marca, modelo, referencia, preco_centavos, estado, consignada, fotos(count)",
    )
    .order("estado", { ascending: true })
    .order("criado_em", { ascending: false });

  const pecas = (data ?? []) as unknown as LinhaLista[];
  const total = pecas.length;
  const conta = (e: Estado) => pecas.filter((p) => p.estado === e).length;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Peças
          </h1>
          <p className="meta">
            {conta("disponivel")} disponíve
            {conta("disponivel") === 1 ? "l" : "is"}
            {conta("reservada") > 0 && ` · ${conta("reservada")} em negociação`}
            {conta("vendida") > 0 && ` · ${conta("vendida")} vendida${conta("vendida") === 1 ? "" : "s"}`}
            {" · "}
            {total} no acervo
          </p>
        </div>

        <Link href="/painel/pecas/nova" className="btn btn-primary self-start">
          Cadastrar peça
        </Link>
      </header>

      {total === 0 ? (
        <div
          className="border px-6 py-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p style={{ color: "var(--color-foreground)" }}>
            Nenhuma peça cadastrada ainda.
          </p>
          <p className="meta mx-auto mt-2 max-w-sm">
            Cadastre a primeira: marca, modelo e preço bastam para começar. As
            fotos e as especificações entram depois, na tela da peça.
          </p>
          <Link
            href="/painel/pecas/nova"
            className="btn btn-primary mt-6 inline-flex"
          >
            Cadastrar a primeira peça
          </Link>
        </div>
      ) : (
        <ul
          className="flex flex-col divide-y border-y"
          style={{ borderColor: "var(--color-border)" }}
        >
          {pecas.map((p) => {
            const fotos = p.fotos?.[0]?.count ?? 0;
            const vendida = p.estado === "vendida";
            return (
              <li
                key={p.slug}
                className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between md:gap-6"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/painel/pecas/${p.slug}`}
                    className="link-quiet truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.15rem",
                      // Vendida fica visualmente recuada, sem sumir da lista.
                      color: vendida
                        ? "var(--color-muted)"
                        : "var(--color-foreground)",
                    }}
                  >
                    {p.marca} {p.modelo}
                  </Link>
                  <span className="meta">
                    {p.referencia ? `Ref. ${p.referencia}` : "Sem referência"}
                    {p.consignada ? " · consignada" : ""}
                    {" · "}
                    {/*
                      Peça sem foto não some da vitrine — ela aparece com o
                      placeholder tipográfico. Dizer isso aqui é o que faz o
                      Andre lembrar de voltar e fotografar.
                    */}
                    <span
                      style={{
                        color: fotos === 0 ? "var(--estado-alerta)" : undefined,
                      }}
                    >
                      {fotos === 0
                        ? "sem foto"
                        : `${fotos} foto${fotos === 1 ? "" : "s"}`}
                    </span>
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 md:gap-5">
                  <span className="text-sm tabular-nums">
                    {formatPrice(p.preco_centavos)}
                  </span>

                  <SeletorEstado slug={p.slug} estado={p.estado} />

                  {/*
                    O nome já abre a peça, mas o botão diz que abre. Descobrir
                    que a linha é clicável exige tentar — e num painel de
                    trabalho ninguém deveria precisar tentar.
                  */}
                  <Link
                    href={`/painel/pecas/${p.slug}`}
                    className="label border px-3 py-2"
                    style={{
                      minHeight: 40,
                      borderColor: "var(--color-border)",
                      color: "var(--color-foreground)",
                    }}
                  >
                    Editar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="meta">
        O estado aparece para o cliente: disponível segue com botão de WhatsApp,
        em negociação ganha um aviso e continua à venda, vendida vira registro
        do que passou pela casa.
      </p>
    </div>
  );
}
