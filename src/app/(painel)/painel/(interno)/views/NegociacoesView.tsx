"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { SeletorStatusInteresse } from "../negociacoes/SeletorStatusInteresse";
import type { StatusInteresse } from "../negociacoes/actions";
import type { DadosPainel } from "../dados-painel";

export interface LinhaInteresse {
  id: string;
  status: StatusInteresse;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
  clientes: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  } | null;
  pecas: {
    id: string;
    slug: string;
    marca: string;
    modelo: string;
    preco_centavos: number;
    estado: string;
    fotos: { url: string; ordem: number }[] | null;
  } | null;
}

export interface LinhaProposta {
  id: string;
  nome: string;
  contato: string;
  intencao: string;
  marca: string;
  modelo: string | null;
  referencia: string | null;
  ano: string | null;
  integralidade: string | null;
  observacao: string | null;
  status: string;
  criado_em: string;
}

interface NegociacoesViewProps {
  totalAcessos: number;
  totalViuPeca: number;
  totalWhatsApp: number;
  interessesRaw: DadosPainel["negociacoesData"]["interessesRaw"];
  propostas: LinhaProposta[];
}

function formatarData(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function NegociacoesView({
  totalAcessos,
  totalViuPeca,
  totalWhatsApp,
  interessesRaw,
  propostas,
}: NegociacoesViewProps) {
  const interesses = (interessesRaw ?? []) as unknown as LinhaInteresse[];

  const taxaConversao = totalAcessos
    ? (((totalWhatsApp ?? 0) / totalAcessos) * 100).toFixed(1)
    : "0";

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Negociações & Funil
        </h1>
        <p className="meta">
          Inteligência de prospecção e pipeline dos contatos realizados no WhatsApp.
        </p>
      </header>

      {/* ── Cards do Funil (30 dias) ────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Métricas do funil">
        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Acessos ao acervo</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-foreground)" }}>
            {totalAcessos ?? 0}
          </span>
          <span className="meta mt-1">últimos 30 dias</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Peças visualizadas</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-foreground)" }}>
            {totalViuPeca ?? 0}
          </span>
          <span className="meta mt-1">exibições de fichas</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-accent)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Idas ao WhatsApp</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-accent)" }}>
            {totalWhatsApp ?? 0}
          </span>
          <span className="meta mt-1">cliques em interesse</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Taxa de conversão</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--estado-ok)" }}>
            {taxaConversao}%
          </span>
          <span className="meta mt-1">WhatsApp / Acessos</span>
        </div>
      </section>

      {/* ── Pipeline de Negociações ────────────────────────────────────── */}
      <section className="flex flex-col gap-6" aria-labelledby="pipeline-title">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 id="pipeline-title" className="label">
              Pipeline de Negociações ({interesses.length})
            </h2>
            <p className="meta mt-0.5">
              Clientes que clicaram no WhatsApp para negociar uma peça do acervo.
            </p>
          </div>
        </div>

        {interesses.length === 0 ? (
          <div
            className="border p-12 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p style={{ color: "var(--color-foreground)" }}>Nenhuma negociação aberta ainda.</p>
            <p className="meta mt-2 max-w-md mx-auto text-xs">
              Quando um cliente ativo visualizar uma peça no acervo e clicar para falar no WhatsApp, a negociação entra aqui automaticamente.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-3.5">
            {interesses.map((item) => {
              const cliente = item.clientes;
              const peca = item.pecas;

              return (
                <li
                  key={item.id}
                  className="group flex flex-col justify-between gap-3.5 p-4 sm:p-5 border transition-all duration-200 hover:border-[var(--color-foreground)]"
                  style={{
                    borderColor: "var(--color-border)",
                    background: "var(--color-surface)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cliente ? (
                          <Link
                            href={`/painel/clientes/${cliente.id}`}
                            className="font-medium text-base hover:underline"
                            style={{ color: "var(--color-foreground)" }}
                          >
                            {cliente.nome}
                          </Link>
                        ) : (
                          <span className="text-sm font-medium">Cliente removido</span>
                        )}
                        {cliente?.telefone && (
                          <a
                            href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2 py-0.5 rounded border border-emerald-800/40 text-emerald-400 bg-emerald-950/30 hover:bg-emerald-900/40 transition-colors inline-flex items-center gap-1 font-mono"
                          >
                            <span>WhatsApp</span>
                            <span>↗</span>
                          </a>
                        )}
                      </div>

                      {peca ? (
                        <div className="flex items-center gap-2 text-sm mt-1 flex-wrap">
                          <Link
                            href={`/painel/pecas/${peca.slug}`}
                            className="font-medium hover:underline"
                            style={{ color: "var(--color-accent)" }}
                          >
                            {peca.marca} {peca.modelo}
                          </Link>
                          <span className="meta">·</span>
                          <span className="font-mono text-xs" style={{ color: "var(--color-foreground)" }}>
                            {formatPrice(peca.preco_centavos)}
                          </span>
                        </div>
                      ) : (
                        <span className="meta text-xs mt-1">Peça descontinuada</span>
                      )}
                    </div>

                    <span className="meta text-[11px] shrink-0 text-right">
                      {formatarData(item.atualizado_em)}
                    </span>
                  </div>

                  <div
                    className="flex items-center justify-between gap-3 pt-3 border-t text-xs"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <span className="meta text-xs">Etapa da negociação:</span>
                    <SeletorStatusInteresse id={item.id} statusAtual={item.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/*
        Propostas de venda.

        Entram por fora do acervo — é gente oferecendo peça à casa, não gente
        querendo comprar — mas moram na mesma tela porque a decisão é a mesma:
        responder ou não, e quando. Ficam depois do pipeline, que é o dinheiro
        já em movimento.
      */}
      <section className="flex flex-col gap-6" aria-labelledby="propostas-title">
        <div>
          <h2 id="propostas-title" className="label">
            Propostas de venda ({propostas.length})
          </h2>
          <p className="meta mt-0.5">
            Quem ofereceu um relógio pelo formulário de “Vender”. Chega aqui
            mesmo quando a pessoa não abre a conversa no WhatsApp.
          </p>
        </div>

        {propostas.length === 0 ? (
          <div
            className="border p-10 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p style={{ color: "var(--color-foreground)" }}>
              Nenhuma proposta recebida ainda.
            </p>
            <p className="meta mt-2 max-w-md mx-auto text-xs">
              O formulário da página “Vender” registra aqui antes de abrir
              qualquer conversa.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-3.5">
            {propostas.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 border p-4 sm:p-5"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="meta text-[11px] uppercase tracking-wider">
                      {p.intencao}
                    </span>
                    <span
                      className="font-medium text-base"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {p.marca}
                      {p.modelo ? ` ${p.modelo}` : ""}
                    </span>
                    <span className="meta text-xs">
                      {p.referencia ? `Ref. ${p.referencia}` : "Sem referência"}
                      {p.ano ? ` · ${p.ano}` : ""}
                      {p.integralidade ? ` · ${p.integralidade}` : ""}
                    </span>
                  </div>
                  <span className="meta text-xs shrink-0">
                    {formatarData(p.criado_em)}
                  </span>
                </div>

                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <span style={{ color: "var(--color-foreground)" }}>
                    {p.nome}
                  </span>
                  <span className="meta font-mono">{p.contato}</span>
                </div>

                {p.observacao && (
                  <p className="meta text-xs leading-relaxed">{p.observacao}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
