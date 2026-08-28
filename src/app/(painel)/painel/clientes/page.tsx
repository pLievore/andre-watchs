import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { ativarCliente, desativarCliente } from "./actions";

export const metadata: Metadata = { title: "Clientes" };

/** "há 3 dias" diz mais que uma data — o que importa é quão recente foi. */
function desdeQuando(iso: string | null): string {
  if (!iso) return "nunca entrou";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return "há mais de um mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

export default async function PainelClientesPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  const { data: clientes } = await dbAdmin
    .from("clientes")
    .select("id, nome, email, telefone, status, criado_em, ultimo_acesso")
    // Ativos primeiro; dentro do grupo, quem entrou mais recentemente no topo.
    .order("status", { ascending: true })
    .order("ultimo_acesso", { ascending: false, nullsFirst: false });

  const lista = clientes ?? [];
  const ativos = lista.filter((c) => c.status === "ativo");
  const outros = lista.filter((c) => c.status !== "ativo");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.6rem, 4vw, 2.25rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Clientes
        </h1>
        <p className="meta">
          {ativos.length} com acesso
          {outros.length > 0 && ` · ${outros.length} sem acesso`}
        </p>
      </header>

      {lista.length === 0 ? (
        <div
          className="border px-6 py-10 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p style={{ color: "var(--color-foreground)" }}>
            Nenhum cliente cadastrado.
          </p>
          <p className="meta mt-2">
            Clientes entram por aprovação de pedido, na aba Pedidos.
          </p>
        </div>
      ) : (
        <ul
          className="flex flex-col divide-y border-y"
          style={{ borderColor: "var(--color-border)" }}
        >
          {lista.map((c) => {
            const ativo = c.status === "ativo";
            return (
              <li
                key={c.id}
                className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between md:gap-6"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span
                    className="truncate"
                    style={{
                      fontSize: "1rem",
                      color: ativo
                        ? "var(--color-foreground)"
                        : "var(--color-muted)",
                    }}
                  >
                    {c.nome}
                  </span>
                  <span className="meta truncate">
                    {c.email}
                    {c.telefone ? ` · ${c.telefone}` : ""}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <span className="meta whitespace-nowrap">
                    {desdeQuando(c.ultimo_acesso)}
                  </span>

                  <span className={`selo ${ativo ? "selo-ok" : ""}`}>
                    {ativo ? "Com acesso" : "Sem acesso"}
                  </span>

                  <form action={ativo ? desativarCliente : ativarCliente}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="label px-3 py-2 underline-offset-4 hover:underline"
                      style={{
                        minHeight: 44,
                        color: ativo
                          ? "var(--estado-erro)"
                          : "var(--estado-ok)",
                      }}
                    >
                      {ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="meta">
        Desativar tira a pessoa do acervo imediatamente, sem apagar o histórico.
        Ela continua listada e pode ser reativada.
      </p>
    </div>
  );
}
