import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { SeletorStatus } from "./SeletorStatus";
import { corDoStatus, rotuloDoStatus, type Status } from "./status";

export const metadata: Metadata = { title: "Clientes" };

interface Linha {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: Status;
  criado_em: string;
  ultimo_acesso: string | null;
}

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

export default async function PainelClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  let consulta = dbAdmin
    .from("clientes")
    .select("id, nome, email, telefone, status, criado_em, ultimo_acesso");

  // Busca no servidor, e não filtro no cliente: a lista cresce com o negócio,
  // e mandar o cadastro inteiro para o navegador só para filtrar seria expor
  // dado de todo mundo para achar um.
  if (busca) {
    const termo = `%${busca}%`;
    consulta = consulta.or(
      `nome.ilike.${termo},email.ilike.${termo},telefone.ilike.${termo}`,
    );
  }

  const { data } = await consulta
    .order("status", { ascending: true })
    .order("ultimo_acesso", { ascending: false, nullsFirst: false });

  const lista = (data ?? []) as Linha[];
  const conta = (s: Status) => lista.filter((c) => c.status === s).length;

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
            Clientes
          </h1>
          <p className="meta">
            {busca
              ? `${lista.length} resultado${lista.length === 1 ? "" : "s"} para “${busca}”`
              : [
                  `${conta("ativo")} com acesso`,
                  conta("pendente") && `${conta("pendente")} em análise`,
                  conta("inativo") && `${conta("inativo")} sem acesso`,
                  conta("recusado") && `${conta("recusado")} recusado${conta("recusado") === 1 ? "" : "s"}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>

        <Link href="/painel/clientes/novo" className="btn btn-primary self-start">
          Cadastrar cliente
        </Link>
      </header>

      {/* GET simples: a busca fica na URL e pode ser recarregada e compartilhada. */}
      <form method="get" className="flex flex-wrap gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar cliente
        </label>
        <input
          id="q"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome, e-mail ou telefone"
          className="campo max-w-sm flex-1"
          style={{ minWidth: "14rem" }}
        />
        <button
          type="submit"
          className="label border px-4"
          style={{ minHeight: 44, borderColor: "var(--color-border)" }}
        >
          Buscar
        </button>
        {busca && (
          <Link
            href="/painel/clientes"
            className="label flex items-center px-3"
            style={{ minHeight: 44, color: "var(--color-muted)" }}
          >
            Limpar
          </Link>
        )}
      </form>

      {lista.length === 0 ? (
        <div
          className="border px-6 py-12 text-center"
          style={{ borderColor: "var(--color-border)" }}
        >
          <p style={{ color: "var(--color-foreground)" }}>
            {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
          </p>
          <p className="meta mx-auto mt-2 max-w-sm">
            {busca
              ? "Tente parte do nome, ou o e-mail."
              : "Cadastre direto quem você já conhece, ou aprove um pedido na aba Pedidos."}
          </p>
          {!busca && (
            <Link
              href="/painel/clientes/novo"
              className="btn btn-primary mt-6 inline-flex"
            >
              Cadastrar o primeiro
            </Link>
          )}
        </div>
      ) : (
        <ul
          className="flex flex-col divide-y border-y"
          style={{ borderColor: "var(--color-border)" }}
        >
          {lista.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between md:gap-6"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={`/painel/clientes/${c.id}`}
                  className="link-quiet truncate"
                  style={{
                    fontSize: "1rem",
                    color:
                      c.status === "ativo"
                        ? "var(--color-foreground)"
                        : "var(--color-muted)",
                  }}
                >
                  {c.nome}
                </Link>
                <span className="meta truncate">
                  {c.email}
                  {c.telefone ? ` · ${c.telefone}` : ""}
                </span>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-3 md:gap-4">
                <span className="meta whitespace-nowrap">
                  {desdeQuando(c.ultimo_acesso)}
                </span>

                <span
                  className="selo"
                  style={{ color: corDoStatus(c.status) }}
                >
                  {rotuloDoStatus(c.status)}
                </span>

                <SeletorStatus id={c.id} status={c.status} />

                {/* O nome já abre a ficha, mas o botão diz que abre. */}
                <Link
                  href={`/painel/clientes/${c.id}`}
                  className="label border px-3 py-2"
                  style={{
                    minHeight: 40,
                    borderColor: "var(--color-border)",
                    color: "var(--color-foreground)",
                  }}
                >
                  Abrir
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="meta">
        Abra a ficha para corrigir cadastro, trocar o e-mail de acesso ou
        redefinir a senha de quem não está conseguindo entrar.
      </p>
    </div>
  );
}
