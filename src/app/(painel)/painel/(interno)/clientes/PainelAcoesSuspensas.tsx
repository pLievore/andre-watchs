"use client";

import { useEffect, useRef, useState } from "react";
import { aprovarSolicitacao, recusarSolicitacao } from "../actions";
import { GeradorConvite } from "./GeradorConvite";
import type { ConviteItem } from "./convites-actions";

export interface SolicitacaoItem {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  observacao: string | null;
  criado_em: string;
}

export interface RecusadaItem {
  id: number;
  nome: string;
  email: string;
  resolvido_em: string | null;
}

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function PainelAcoesSuspensas({
  pendentes,
  recusadas,
  convites,
}: {
  pendentes: SolicitacaoItem[];
  recusadas: RecusadaItem[];
  convites: ConviteItem[];
}) {
  const [aberto, setAberto] = useState<"pedidos" | "convites" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalPendentes = pendentes.length;
  const convitesValidos = convites.filter((c) => c.status === "ativo").length;

  useEffect(() => {
    function tratarCliqueFora(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setAberto(null);
      }
    }

    function tratarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAberto(null);
      }
    }

    if (aberto) {
      document.addEventListener("mousedown", tratarCliqueFora);
      document.addEventListener("keydown", tratarTecla);
    }

    return () => {
      document.removeEventListener("mousedown", tratarCliqueFora);
      document.removeEventListener("keydown", tratarTecla);
    };
  }, [aberto]);

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      {/* ── Barra de Botões Suspensos ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Botão 1: Pedidos para analisar */}
        <button
          type="button"
          onClick={() =>
            setAberto((prev) => (prev === "pedidos" ? null : "pedidos"))
          }
          aria-expanded={aberto === "pedidos"}
          className="flex items-center gap-2.5 border px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-200"
          style={{
            borderColor:
              totalPendentes > 0
                ? "var(--color-accent)"
                : aberto === "pedidos"
                  ? "var(--color-foreground)"
                  : "var(--color-border)",
            background:
              aberto === "pedidos"
                ? "var(--color-surface-2)"
                : "var(--color-surface)",
            color:
              totalPendentes > 0
                ? "var(--color-accent)"
                : "var(--color-foreground)",
          }}
        >
          <span
            className="grid h-5 min-w-5 place-items-center rounded-full border text-[11px] font-mono"
            style={{
              borderColor:
                totalPendentes > 0
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              color:
                totalPendentes > 0
                  ? "var(--color-accent)"
                  : "var(--color-muted)",
            }}
          >
            {totalPendentes}
          </span>
          <span>Pedidos para analisar</span>
          <span
            className="text-[10px] transition-transform duration-200"
            style={{
              transform: aberto === "pedidos" ? "rotate(180deg)" : "none",
            }}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {/* Botão 2: Gerar convite exclusivo */}
        <button
          type="button"
          onClick={() =>
            setAberto((prev) => (prev === "convites" ? null : "convites"))
          }
          aria-expanded={aberto === "convites"}
          className="flex items-center gap-2 border px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors duration-200"
          style={{
            borderColor:
              aberto === "convites"
                ? "var(--color-foreground)"
                : "var(--color-border)",
            background:
              aberto === "convites"
                ? "var(--color-surface-2)"
                : "var(--color-surface)",
            color: "var(--color-foreground)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Gerar convite</span>
          {convitesValidos > 0 && (
            <span className="meta text-[10px] font-mono">
              ({convitesValidos} ativo{convitesValidos > 1 ? "s" : ""})
            </span>
          )}
          <span
            className="text-[10px] transition-transform duration-200"
            style={{
              transform: aberto === "convites" ? "rotate(180deg)" : "none",
            }}
            aria-hidden
          >
            ▼
          </span>
        </button>
      </div>

      {/* ── Painel Suspenso Flutuante: Pedidos ──────────────────────────── */}
      {aberto === "pedidos" && (
        <div
          className="absolute left-0 top-full z-40 mt-2 w-full max-w-2xl border p-5 md:p-6 shadow-2xl"
          style={{
            background: "var(--color-surface)",
            borderColor:
              totalPendentes > 0
                ? "var(--color-accent)"
                : "var(--color-border)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75)",
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <h2 className="label text-sm">Pedidos para analisar</h2>
              <p className="meta mt-0.5">Novos contatos solicitando aprovação antes de virarem clientes.</p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(null)}
              className="meta hover:text-white p-1 text-sm leading-none"
              title="Fechar painel"
            >
              ✕
            </button>
          </div>

          {!totalPendentes ? (
            <p className="py-6 text-sm" style={{ color: "var(--color-muted)" }}>
              Tudo em dia. Nenhum pedido aguardando resposta.
            </p>
          ) : (
            <ul
              className="max-h-96 overflow-y-auto divide-y"
              style={{ borderColor: "var(--color-border)" }}
            >
              {pendentes.map((solicitacao) => (
                <li
                  key={solicitacao.id}
                  className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--color-foreground)" }}>
                      {solicitacao.nome}
                    </p>
                    <p className="meta text-xs break-words">
                      {solicitacao.email} · {solicitacao.telefone} · em{" "}
                      {formatarData(solicitacao.criado_em)}
                    </p>
                    {solicitacao.observacao && (
                      <p
                        className="mt-1.5 max-w-xl text-xs leading-relaxed"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {solicitacao.observacao}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <form action={recusarSolicitacao}>
                      <input type="hidden" name="id" value={solicitacao.id} />
                      <button
                        type="submit"
                        className="btn btn-ghost text-xs py-1.5 px-3"
                      >
                        Recusar
                      </button>
                    </form>
                    <form action={aprovarSolicitacao}>
                      <input type="hidden" name="id" value={solicitacao.id} />
                      <button
                        type="submit"
                        className="btn btn-primary text-xs py-1.5 px-3"
                      >
                        Aprovar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!!recusadas.length && (
            <details
              className="mt-4 border-t pt-3"
              style={{ borderColor: "var(--color-border)" }}
            >
              <summary className="meta cursor-pointer py-1 text-xs">
                Ver pedidos recusados recentes ({recusadas.length})
              </summary>
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto text-xs">
                {recusadas.map((s) => (
                  <li key={s.id} className="meta">
                    {s.nome} — {s.email} · {s.resolvido_em ? formatarData(s.resolvido_em) : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Painel Suspenso Flutuante: Gerador de Convite ────────────────── */}
      {aberto === "convites" && (
        <div
          className="absolute left-0 top-full z-40 mt-2 w-full max-w-2xl border p-5 md:p-6 shadow-2xl"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75)",
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b pb-4 mb-4" style={{ borderColor: "var(--color-border)" }}>
            <div>
              <h2 className="label text-sm">Convites por Link</h2>
              <p className="meta mt-0.5">Emissão de links exclusivos de uso único válidos por 7 dias.</p>
            </div>
            <button
              type="button"
              onClick={() => setAberto(null)}
              className="meta hover:text-white p-1 text-sm leading-none"
              title="Fechar painel"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <GeradorConvite convites={convites} />
          </div>
        </div>
      )}
    </div>
  );
}