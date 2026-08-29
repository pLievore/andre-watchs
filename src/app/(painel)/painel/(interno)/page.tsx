import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { PainelAcoesSuspensas } from "./clientes/PainelAcoesSuspensas";
import { listarConvites } from "./clientes/convites-actions";
import { SeletorStatus } from "./clientes/SeletorStatus";
import type { Status } from "./clientes/status";

export const metadata: Metadata = { title: "Clientes" };

interface LinhaCliente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: Status;
  criado_em: string;
  ultimo_acesso: string | null;
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
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

  let consultaClientes = dbAdmin
    .from("clientes")
    .select("id, nome, email, telefone, status, criado_em, ultimo_acesso");

  // A busca acontece no servidor para não expor a base inteira ao navegador.
  if (busca) {
    const termo = `%${busca}%`;
    consultaClientes = consultaClientes.or(
      `nome.ilike.${termo},email.ilike.${termo},telefone.ilike.${termo}`,
    );
  }

  const [{ data: clientes }, { data: pendentes }, { data: recusadas }, convites] =
    await Promise.all([
      consultaClientes
        .order("status", { ascending: true })
        .order("ultimo_acesso", { ascending: false, nullsFirst: false }),
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
      listarConvites(),
    ]);

  const lista = (clientes ?? []) as LinhaCliente[];
  const conta = (status: Status) =>
    lista.filter((cliente) => cliente.status === status).length;
  const totalPendentes = pendentes?.length ?? 0;

  return (
    <div className="flex flex-col gap-12">
      <header
        className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b pb-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-col gap-1.5">
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
          <p className="meta text-xs">
            {totalPendentes > 0
              ? `${totalPendentes} pedido${totalPendentes === 1 ? "" : "s"} para analisar · `
              : ""}
            {conta("ativo")} com acesso
            {conta("pendente") > 0 && ` · ${conta("pendente")} em análise`}
            {conta("inativo") > 0 && ` · ${conta("inativo")} sem acesso`}
            {conta("recusado") > 0 &&
              ` · ${conta("recusado")} recusado${conta("recusado") === 1 ? "" : "s"}`}
          </p>
        </div>

        <PainelAcoesSuspensas
          pendentes={(pendentes ?? []) as any}
          recusadas={(recusadas ?? []) as any}
          convites={convites}
        />
      </header>

      <section className="flex flex-col gap-7" aria-labelledby="base-title">
        <div>
          <h2 id="base-title" className="label">
            Base de clientes
          </h2>
          <p className="meta mt-1">
            Cadastro, acesso e suporte de quem já pertence à base.
          </p>
        </div>

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
              href="/painel"
              className="label flex items-center px-3"
              style={{ minHeight: 44, color: "var(--color-muted)" }}
            >
              Limpar
            </Link>
          )}
        </form>

        {busca && (
          <p className="meta">
            {lista.length} resultado{lista.length === 1 ? "" : "s"} para “{busca}”
          </p>
        )}

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
                ? "Tente parte do nome ou do e-mail."
                : "Cadastre quem você já conhece ou aprove um pedido acima."}
            </p>
          </div>
        ) : (
          <ul
            className="flex flex-col divide-y border-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {lista.map((cliente) => (
              <li
                key={cliente.id}
                className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between md:gap-6"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/painel/clientes/${cliente.id}`}
                    className="link-quiet truncate"
                    style={{
                      fontSize: "1rem",
                      color:
                        cliente.status === "ativo"
                          ? "var(--color-foreground)"
                          : "var(--color-muted)",
                    }}
                  >
                    {cliente.nome}
                  </Link>
                  <span className="meta truncate">
                    {cliente.email}
                    {cliente.telefone ? ` · ${cliente.telefone}` : ""}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3 md:gap-4">
                  <span className="meta whitespace-nowrap">
                    {desdeQuando(cliente.ultimo_acesso)}
                  </span>
                  <SeletorStatus id={cliente.id} status={cliente.status} />
                  <Link
                    href={`/painel/clientes/${cliente.id}`}
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
      </section>
    </div>
  );
}
