"use client";

import { useState } from "react";
import { motion } from "motion/react";

export interface DiaSerie {
  dataIso: string;
  rotulo: string;
  diaSemana: string;
  acessos: number;
  visualizacoes: number;
  whatsapps: number;
}

interface GraficoTendenciaProps {
  dias: DiaSerie[];
}

export function GraficoTendencia({ dias }: GraficoTendenciaProps) {
  // No mobile, 7 dias é o padrão de ouro para caber 100% na largura sem barra de rolagem.
  const [periodo, setPeriodo] = useState<7 | 14>(7);

  // Filtra os últimos N dias
  const diasFiltrados = dias.slice(-periodo);

  // Dia ativo selecionado para inspeção detalhada
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSerie | null>(() => {
    // Começa selecionando o dia de hoje (último elemento) ou o dia com maior movimento
    return diasFiltrados[diasFiltrados.length - 1] ?? null;
  });

  // Totais do período selecionado
  const somaAcessos = diasFiltrados.reduce((acc, d) => acc + d.acessos, 0);
  const somaViews = diasFiltrados.reduce((acc, d) => acc + d.visualizacoes, 0);
  const somaWhats = diasFiltrados.reduce((acc, d) => acc + d.whatsapps, 0);

  // Escala máxima do eixo Y
  const maiorValor = Math.max(
    ...diasFiltrados.map((d) => Math.max(d.acessos, d.visualizacoes, d.whatsapps)),
    0
  );
  // Se for tudo zero, define escala padrão 5 para desenhar as linhas guias
  const tetoEscala = maiorValor > 0 ? maiorValor : 5;
  const meioEscala = Math.round(tetoEscala / 2);

  return (
    <section
      className="border p-4 sm:p-6 flex flex-col gap-5 rounded-sm"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* ── Topo: Título e Seletor 7d / 14d ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] uppercase font-mono tracking-widest font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(194, 168, 117, 0.12)",
                color: "var(--color-accent)",
              }}
            >
              Interações
            </span>
            <h2 className="label text-sm uppercase tracking-wider">
              Tendência Diária de Interações
            </h2>
          </div>
          <p className="meta text-xs mt-1">
            Volume comparativo por dia entre visitas ao acervo, relógios abertos e chamadas no WhatsApp.
          </p>
        </div>

        {/* Seletor de Período (7 dias vs 14 dias) */}
        <div
          className="inline-flex self-start sm:self-auto items-center p-0.5 rounded border text-xs font-mono"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-2)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPeriodo(7);
              setDiaSelecionado(dias.slice(-7)[6] ?? null);
            }}
            className={`px-3 py-1 rounded transition-all ${
              periodo === 7
                ? "font-semibold shadow-sm"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              background:
                periodo === 7 ? "var(--color-surface)" : "transparent",
              color:
                periodo === 7
                  ? "var(--color-foreground)"
                  : "var(--color-muted)",
            }}
          >
            7 dias (Mobile)
          </button>
          <button
            type="button"
            onClick={() => {
              setPeriodo(14);
              setDiaSelecionado(dias.slice(-14)[13] ?? null);
            }}
            className={`px-3 py-1 rounded transition-all ${
              periodo === 14
                ? "font-semibold shadow-sm"
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              background:
                periodo === 14 ? "var(--color-surface)" : "transparent",
              color:
                periodo === 14
                  ? "var(--color-foreground)"
                  : "var(--color-muted)",
            }}
          >
            14 dias
          </button>
        </div>
      </div>

      {/* ── Métricas Totais do Período & Legenda ─────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-2 py-3 px-3.5 border rounded"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className="w-2.5 h-2.5 rounded-[1px] shrink-0"
              style={{ background: "var(--color-foreground)" }}
            />
            <span className="meta text-[11px] truncate">Acessos</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-medium mt-0.5" style={{ color: "var(--color-foreground)" }}>
            {somaAcessos}
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className="w-2.5 h-2.5 rounded-[1px] shrink-0"
              style={{ background: "#788296" }}
            />
            <span className="meta text-[11px] truncate">Fichas</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-medium mt-0.5" style={{ color: "var(--color-foreground)" }}>
            {somaViews}
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className="w-2.5 h-2.5 rounded-[1px] shrink-0"
              style={{ background: "var(--color-accent)" }}
            />
            <span className="meta text-[11px] truncate">WhatsApp</span>
          </div>
          <span className="text-lg sm:text-xl font-mono font-medium mt-0.5" style={{ color: "var(--color-accent)" }}>
            {somaWhats}
          </span>
        </div>
      </div>

      {/* ── Painel de Detalhes do Dia Selecionado (Toque Interativo) ────── */}
      {diaSelecionado && (
        <div
          className="flex items-center justify-between px-3 py-2 border rounded text-xs font-mono"
          style={{
            borderColor: "rgba(194, 168, 117, 0.3)",
            background: "rgba(194, 168, 117, 0.05)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
              {diaSelecionado.rotulo} ({diaSelecionado.diaSemana})
            </span>
            <span className="meta hidden xs:inline">·</span>
            <span className="meta hidden xs:inline">Toque em outro dia para inspecionar</span>
          </div>

          <div className="flex items-center gap-3">
            <span style={{ color: "var(--color-foreground)" }}>
              {diaSelecionado.acessos} acessos
            </span>
            <span style={{ color: "#788296" }}>
              {diaSelecionado.visualizacoes} fichas
            </span>
            <span className="font-semibold" style={{ color: "var(--color-accent)" }}>
              {diaSelecionado.whatsapps} whats
            </span>
          </div>
        </div>
      )}

      {/* ── Gráfico de Barras com Linhas-Guia (Eixo Y) ──────────────────── */}
      <div className="relative pt-2 pb-1">
        {/* Linhas-Guia Horizontais com valores do Eixo Y */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-7 z-0">
          <div className="w-full flex items-center gap-2 border-b border-dashed border-[var(--color-surface-2)]">
            <span className="font-mono text-[9px] text-[var(--color-muted)] w-5 text-right">{tetoEscala}</span>
            <div className="flex-1 h-px bg-[var(--color-surface-2)]" />
          </div>
          <div className="w-full flex items-center gap-2 border-b border-dashed border-[var(--color-surface-2)]">
            <span className="font-mono text-[9px] text-[var(--color-muted)] w-5 text-right">{meioEscala}</span>
            <div className="flex-1 h-px bg-[var(--color-surface-2)]" />
          </div>
          <div className="w-full flex items-center gap-2 border-b border-[var(--color-border)]">
            <span className="font-mono text-[9px] text-[var(--color-muted)] w-5 text-right">0</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>
        </div>

        {/* Container das Colunas */}
        <div
          className={`relative z-10 flex items-end justify-between gap-1 sm:gap-2 h-44 sm:h-52 pl-7 ${
            periodo === 14 ? "overflow-x-auto pb-1" : ""
          }`}
        >
          {diasFiltrados.map((dia) => {
            const ehSelecionado = diaSelecionado?.dataIso === dia.dataIso;

            // Alturas relativas (em porcentagem de 0 a 100%)
            // Se for 0, altura é 0% (não desenha barra fantasma de 4px)
            const hAcessosPct =
              dia.acessos > 0
                ? Math.max(8, Math.round((dia.acessos / tetoEscala) * 92))
                : 0;
            const hViewsPct =
              dia.visualizacoes > 0
                ? Math.max(8, Math.round((dia.visualizacoes / tetoEscala) * 92))
                : 0;
            const hWhatsPct =
              dia.whatsapps > 0
                ? Math.max(8, Math.round((dia.whatsapps / tetoEscala) * 92))
                : 0;

            const temAlgumEvento =
              dia.acessos > 0 || dia.visualizacoes > 0 || dia.whatsapps > 0;

            return (
              <button
                key={dia.dataIso}
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                className={`flex-1 ${
                  periodo === 14 ? "min-w-[34px]" : "min-w-0"
                } flex flex-col items-center justify-end h-full group transition-all rounded p-0.5 relative`}
                style={{
                  background: ehSelecionado
                    ? "rgba(194, 168, 117, 0.08)"
                    : "transparent",
                }}
              >
                {/* Barras agrupadas com proporção real */}
                <div className="flex items-end justify-center gap-1 sm:gap-1.5 w-full h-[82%] mb-1">
                  {/* Barra 1: Acessos */}
                  {hAcessosPct > 0 ? (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${hAcessosPct}%` }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                      className="w-1.5 sm:w-2.5 rounded-t-[2px] transition-transform group-hover:scale-y-105"
                      style={{ background: "var(--color-foreground)" }}
                      title={`${dia.rotulo}: ${dia.acessos} acessos`}
                    />
                  ) : (
                    <div className="w-1.5 sm:w-2.5 h-0.5 rounded-full bg-[var(--color-border)]" />
                  )}

                  {/* Barra 2: Fichas Vistas */}
                  {hViewsPct > 0 ? (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${hViewsPct}%` }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.03 }}
                      className="w-1.5 sm:w-2.5 rounded-t-[2px] transition-transform group-hover:scale-y-105"
                      style={{ background: "#788296" }}
                      title={`${dia.rotulo}: ${dia.visualizacoes} fichas`}
                    />
                  ) : (
                    <div className="w-1.5 sm:w-2.5 h-0.5 rounded-full bg-[var(--color-border)]" />
                  )}

                  {/* Barra 3: WhatsApp */}
                  {hWhatsPct > 0 ? (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${hWhatsPct}%` }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                      className="w-1.5 sm:w-2.5 rounded-t-[2px] transition-transform group-hover:scale-y-105 shadow-sm"
                      style={{
                        background: "var(--color-accent)",
                        boxShadow: "0 0 6px rgba(194, 168, 117, 0.3)",
                      }}
                      title={`${dia.rotulo}: ${dia.whatsapps} whatsapp`}
                    />
                  ) : (
                    <div className="w-1.5 sm:w-2.5 h-0.5 rounded-full bg-[var(--color-border)]" />
                  )}
                </div>

                {/* Rótulo inferior da data e dia da semana */}
                <div className="flex flex-col items-center mt-1">
                  <span
                    className={`font-mono text-[10px] sm:text-[11px] leading-tight ${
                      ehSelecionado
                        ? "font-semibold text-[var(--color-accent)]"
                        : temAlgumEvento
                        ? "text-[var(--color-foreground)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {dia.rotulo.split("/")[0]}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase leading-none mt-0.5 ${
                      ehSelecionado
                        ? "text-[var(--color-accent)]"
                        : "text-[var(--color-muted)]"
                    }`}
                  >
                    {dia.diaSemana}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
