"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

import { PainelAcoesSuspensas } from "../clientes/PainelAcoesSuspensas";
import { SeletorStatus } from "../clientes/SeletorStatus";
import type { Status } from "../clientes/status";
import type { DadosPainel } from "../dados-painel";

export interface LinhaCliente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: Status;
  criado_em: string;
  ultimo_acesso: string | null;
}

/**
 * As listas vêm do carregador do painel, já com a forma do banco (os tipos
 * gerados em `src/lib/db/tipos-banco.ts`). Derivar daqui em vez de escrever
 * `any[]` é o que faz uma coluna renomeada quebrar a compilação em vez de
 * quebrar a tela na frente do dono.
 */
type DadosClientes = DadosPainel["clientesData"];

interface ClientesViewProps {
  clientes: LinhaCliente[];
  pendentes: DadosClientes["pendentes"];
  recusadas: DadosClientes["recusadas"];
  convites: DadosClientes["convites"];
}

function desdeQuando(iso: string | null): string {
  if (!iso) return "nunca entrou";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return "há mais de um mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

function formatarTelefone(tel: string | null): string {
  if (!tel) return "";
  const nums = tel.replace(/\D/g, "");
  if (nums.length === 11) {
    return `(${nums.substring(0, 2)}) ${nums.substring(2, 7)}-${nums.substring(7)}`;
  }
  if (nums.length === 10) {
    return `(${nums.substring(0, 2)}) ${nums.substring(2, 6)}-${nums.substring(6)}`;
  }
  return tel;
}

export function ClientesView({
  clientes,
  pendentes,
  recusadas,
  convites,
}: ClientesViewProps) {
  const [busca, setBusca] = useState("");

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) => {
      const nomeMatch = c.nome?.toLowerCase().includes(termo);
      const emailMatch = c.email?.toLowerCase().includes(termo);
      const telMatch = c.telefone?.replace(/\D/g, "").includes(termo);
      return nomeMatch || emailMatch || telMatch;
    });
  }, [clientes, busca]);

  const conta = (status: Status) =>
    clientes.filter((cliente) => cliente.status === status).length;
  const totalPendentes = pendentes?.length ?? 0;

  return (
    <div className="flex flex-col gap-8 md:gap-10">
      {/* ── Header da Seção com Ações Unificadas ───────────────────────── */}
      <header
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
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
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono font-medium"
              style={{
                background: "var(--color-surface-2)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              {clientes.length}
            </span>
          </div>

          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {totalPendentes > 0 ? (
              <span style={{ color: "var(--color-accent)", fontWeight: 500 }}>
                {totalPendentes} pedido{totalPendentes === 1 ? "" : "s"} para analisar ·{" "}
              </span>
            ) : null}
            {conta("ativo")} com acesso
            {conta("pendente") > 0 && ` · ${conta("pendente")} em análise`}
            {conta("inativo") > 0 && ` · ${conta("inativo")} sem acesso`}
            {conta("recusado") > 0 &&
              ` · ${conta("recusado")} recusado${conta("recusado") === 1 ? "" : "s"}`}
          </p>
        </div>

        <PainelAcoesSuspensas
          pendentes={pendentes}
          recusadas={recusadas}
          convites={convites}
        />
      </header>

      {/* ── Barra de Busca Integrada (Filtro instantâneo sem recarregar) ─ */}
      <section className="flex flex-col gap-4" aria-label="Lista de clientes">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-50"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="q"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone..."
              className="campo w-full pl-10 pr-4 text-xs sm:text-sm"
              style={{ minHeight: 42 }}
            />
          </div>

          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="label border px-3 text-xs shrink-0 flex items-center transition-colors hover:bg-[var(--color-surface-2)]"
              style={{ minHeight: 42, borderColor: "var(--color-border)", color: "var(--color-muted)" }}
              title="Limpar busca"
            >
              Limpar ✕
            </button>
          )}
        </div>

        {busca && (
          <p className="meta text-xs">
            {listaFiltrada.length} resultado{listaFiltrada.length === 1 ? "" : "s"} para “{busca}”
          </p>
        )}

        {/* ── Cartões de Clientes ───────────────────────────────────────── */}
        {listaFiltrada.length === 0 ? (
          <div
            className="border px-6 py-12 text-center"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <p style={{ color: "var(--color-foreground)" }}>
              {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
            </p>
            <p className="meta mx-auto mt-2 max-w-sm text-xs">
              {busca
                ? "Tente buscar por parte do nome, e-mail ou número de telefone."
                : "Cadastre quem você já conhece ou gere um convite exclusivo acima."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-3.5">
            {listaFiltrada.map((cliente) => {
              const iniciais = (cliente.nome || "")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("");

              const telFormatado = formatarTelefone(cliente.telefone);

              return (
                <li
                  key={cliente.id}
                  className="group flex flex-col justify-between gap-3.5 p-4 sm:p-5 border transition-all duration-200 hover:border-[var(--color-foreground)]"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold font-mono"
                        style={{
                          background: "var(--color-surface-2)",
                          color: "var(--color-accent)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        {iniciais || "AW"}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <Link
                          href={`/painel/clientes/${cliente.id}`}
                          className="font-medium text-base truncate hover:underline"
                          style={{
                            color:
                              cliente.status === "ativo"
                                ? "var(--color-foreground)"
                                : "var(--color-muted)",
                          }}
                        >
                          {cliente.nome}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: "var(--color-muted)" }}>
                          <span className="truncate">{cliente.email}</span>
                          {telFormatado && (
                            <>
                              <span aria-hidden>·</span>
                              <a
                                href={`tel:${cliente.telefone?.replace(/\D/g, "")}`}
                                className="hover:text-[var(--color-foreground)] transition-colors"
                              >
                                {telFormatado}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/painel/clientes/${cliente.id}`}
                      className="label shrink-0 border px-3 py-1.5 text-xs inline-flex items-center gap-1 transition-colors hover:bg-[var(--color-surface-2)]"
                      style={{
                        minHeight: 36,
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    >
                      <span>Abrir</span>
                      <span aria-hidden>→</span>
                    </Link>
                  </div>

                  <div
                    className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-muted)" }}>
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5 opacity-60 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <circle cx="12" cy="12" r="9" />
                        <polyline points="12 7 12 12 15 15" />
                      </svg>
                      <span>Último acesso:</span>
                      <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                        {desdeQuando(cliente.ultimo_acesso)}
                      </span>
                    </span>

                    <SeletorStatus id={cliente.id} status={cliente.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
