import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { formatPrice } from "@/lib/format";

import { alternarDisponibilidade } from "./actions";

export const metadata: Metadata = { title: "Peças" };

export default async function PainelPecasPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  // Disponíveis primeiro: é o que o Andre mexe no dia a dia. As vendidas
  // continuam listadas — são o registro do que passou pela casa.
  const { data: pecas } = await dbAdmin
    .from("pecas")
    .select("slug, marca, modelo, referencia, preco_centavos, disponivel, consignada")
    .order("disponivel", { ascending: false })
    .order("criado_em", { ascending: false });

  const total = pecas?.length ?? 0;
  const disponiveis = pecas?.filter((p) => p.disponivel).length ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
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
          {disponiveis} disponíve{disponiveis === 1 ? "l" : "is"} · {total} no
          acervo
        </p>
      </header>

      {total === 0 ? (
        <p style={{ color: "var(--color-muted)" }}>
          Nenhuma peça cadastrada ainda.
        </p>
      ) : (
        <ul
          className="flex flex-col divide-y border-y"
          style={{ borderColor: "var(--color-border)" }}
        >
          {pecas!.map((p) => (
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
                    color: p.disponivel
                      ? "var(--color-foreground)"
                      : "var(--color-muted)",
                  }}
                >
                  {p.marca} {p.modelo}
                </Link>
                <span className="meta">
                  {p.referencia ? `Ref. ${p.referencia}` : "Sem referência"}
                  {p.consignada ? " · consignada" : ""}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-5">
                <span className="text-sm tabular-nums">
                  {formatPrice(p.preco_centavos)}
                </span>

                <form action={alternarDisponibilidade}>
                  <input type="hidden" name="slug" value={p.slug} />
                  <button
                    type="submit"
                    className="label border px-3 py-1.5 transition-colors duration-300"
                    style={{
                      borderColor: p.disponivel
                        ? "var(--color-border)"
                        : "var(--color-foreground)",
                      color: p.disponivel
                        ? "var(--color-muted)"
                        : "var(--color-foreground)",
                    }}
                  >
                    {p.disponivel ? "Disponível" : "Vendida"}
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="meta">
        O botão de estado alterna entre disponível e vendida na hora. Para
        editar os dados da peça, abra o nome.
      </p>
    </div>
  );
}
