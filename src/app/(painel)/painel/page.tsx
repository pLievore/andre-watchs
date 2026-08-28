import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { aprovarSolicitacao, recusarSolicitacao } from "./actions";

export const metadata: Metadata = { title: "Pedidos de acesso" };

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function PainelPedidosPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  const [{ data: pendentes }, { data: recusadas }] = await Promise.all([
    dbAdmin
      .from("solicitacoes_acesso")
      .select("id, nome, email, telefone, observacao, criado_em")
      .is("resolvido_em", null)
      .order("criado_em", { ascending: true }),
    dbAdmin
      .from("solicitacoes_acesso")
      .select("id, nome, email, resolvido_em")
      .not("resolvido_em", "is", null)
      .order("resolvido_em", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="flex flex-col gap-16">
      <section>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            letterSpacing: "-0.02em",
          }}
        >
          Pedidos de acesso
        </h1>

        {!pendentes?.length ? (
          <p className="mt-6 text-base" style={{ color: "var(--color-muted)" }}>
            Nenhum pedido em análise.
          </p>
        ) : (
          <ul
            className="mt-8 flex flex-col divide-y border-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {pendentes.map((s) => (
              <li
                key={s.id}
                className="grid gap-4 py-6 md:grid-cols-[2fr_auto] md:items-center"
              >
                <div>
                  <p className="text-base">{s.nome}</p>
                  <p className="meta">
                    {s.email} · {s.telefone} · pedido em {formatarData(s.criado_em)}
                  </p>
                  {s.observacao && (
                    <p
                      className="mt-2 max-w-md text-sm leading-relaxed"
                      style={{ color: "var(--color-muted)" }}
                    >
                      {s.observacao}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <form action={recusarSolicitacao}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn btn-ghost">
                      Recusar
                    </button>
                  </form>
                  <form action={aprovarSolicitacao}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="btn btn-primary">
                      Aprovar
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!!recusadas?.length && (
        <section>
          <h2 className="label">Recusados recentes</h2>
          <ul className="mt-4 flex flex-col gap-1">
            {recusadas.map((s) => (
              <li
                key={s.id}
                className="text-sm"
                style={{ color: "var(--color-muted)" }}
              >
                {s.nome} — {s.email} · {formatarData(s.resolvido_em!)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
