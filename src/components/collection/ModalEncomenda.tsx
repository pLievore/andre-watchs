"use client";

import { useActionState, useEffect, useState } from "react";
import { registrarEncomenda, type EstadoEncomenda } from "@/app/(site)/acervo/encomendas-actions";

export function ModalEncomenda() {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState<EstadoEncomenda, FormData>(
    registrarEncomenda,
    {},
  );

  useEffect(() => {
    function tratarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    if (aberto) window.addEventListener("keydown", tratarTecla);
    return () => window.removeEventListener("keydown", tratarTecla);
  }, [aberto]);

  return (
    <>
      {/* ── Banner Discreto no Acervo ───────────────────────────────────── */}
      <div
        className="mt-16 border p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="max-w-xl">
          <span
            className="text-xs uppercase tracking-wider font-semibold font-mono"
            style={{ color: "var(--color-accent)" }}
          >
            Serviço de Busca Personalizada
          </span>
          <h3
            className="text-xl sm:text-2xl mt-1.5"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
          >
            Não encontrou o relógio que procura?
          </h3>
          <p className="meta mt-1.5 text-sm">
            A casa localiza referências específicas através de nossa rede de colecionadores e parceiros.
            Registre sua encomenda diretamente na mesa.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAberto(true)}
          className="btn btn-primary text-xs py-2.5 px-5 shrink-0"
        >
          Encomendar com a casa →
        </button>
      </div>

      {/* ── Modal Flutuante de Encomenda ────────────────────────────────── */}
      {aberto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="encomenda-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-200"
          style={{
            background: "rgba(6, 7, 8, 0.85)",
            backdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAberto(false);
          }}
        >
          <div
            className="w-full max-w-lg border p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-start justify-between gap-4 border-b pb-4 mb-5" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider" style={{ color: "var(--color-accent)" }}>
                  ENCOMENDA PRIVADA
                </span>
                <h2
                  id="encomenda-title"
                  className="text-xl sm:text-2xl mt-1"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Registrar Demanda
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="meta hover:text-white p-1 text-sm leading-none"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {estado.sucesso ? (
              <div className="flex flex-col gap-4 py-4">
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-foreground)" }}>
                  {estado.sucesso}
                </p>
                <p className="meta text-xs">
                  Entraremos em contato assim que tivermos novidades sobre a peça.
                </p>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="btn btn-ghost text-xs py-2 px-4 self-start mt-2"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form action={acao} className="flex flex-col gap-4">
                {estado.erro && (
                  <p className="border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {estado.erro}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="marca" className="label text-xs">
                      Marca *
                    </label>
                    <input
                      id="marca"
                      name="marca"
                      type="text"
                      required
                      placeholder="Ex: Rolex, Patek Philippe"
                      className="border p-2 text-sm outline-none transition-colors focus:border-white"
                      style={{
                        background: "var(--color-surface-2)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="modelo" className="label text-xs">
                      Modelo / Linha *
                    </label>
                    <input
                      id="modelo"
                      name="modelo"
                      type="text"
                      required
                      placeholder="Ex: Daytona, Submariner"
                      className="border p-2 text-sm outline-none transition-colors focus:border-white"
                      style={{
                        background: "var(--color-surface-2)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="referencia" className="label text-xs">
                      Referência (se souber)
                    </label>
                    <input
                      id="referencia"
                      name="referencia"
                      type="text"
                      placeholder="Ex: 116500LN"
                      className="border p-2 text-sm outline-none transition-colors focus:border-white"
                      style={{
                        background: "var(--color-surface-2)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="ano_desejado" className="label text-xs">
                      Ano / Época
                    </label>
                    <input
                      id="ano_desejado"
                      name="ano_desejado"
                      type="text"
                      placeholder="Ex: 2020+, Vintage, etc."
                      className="border p-2 text-sm outline-none transition-colors focus:border-white"
                      style={{
                        background: "var(--color-surface-2)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-foreground)",
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="observacoes" className="label text-xs">
                    Preferências e Detalhes
                  </label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    rows={3}
                    placeholder="Cor do mostrador, caixa e papéis, estado pretendido..."
                    className="border p-2 text-sm outline-none transition-colors focus:border-white resize-none"
                    style={{
                      background: "var(--color-surface-2)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-foreground)",
                    }}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
                  <button
                    type="button"
                    onClick={() => setAberto(false)}
                    className="btn btn-ghost text-xs py-2 px-4"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pendente}
                    className="btn btn-primary text-xs py-2 px-4"
                  >
                    {pendente ? "Registrando..." : "Registrar Encomenda"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}