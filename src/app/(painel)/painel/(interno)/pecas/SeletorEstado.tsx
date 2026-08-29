"use client";

/**
 * Escolha do estado comercial, direto da lista com atualização otimista (0ms).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { mudarEstado } from "./actions";

export type Estado = "disponivel" | "reservada" | "vendida";

const OPCOES: readonly { valor: Estado; rotulo: string; nota: string }[] = [
  { valor: "disponivel", rotulo: "Disponível", nota: "à venda no acervo" },
  { valor: "reservada", rotulo: "Em negociação", nota: "aparece, com selo" },
  { valor: "vendida", rotulo: "Vendida", nota: "fica no acervo, sem CTA" },
];

/** Cada estado tem sua cor de estado do sistema — não é decoração. */
function corDe(estado: Estado): string {
  return estado === "disponivel"
    ? "var(--estado-ok)"
    : estado === "reservada"
      ? "var(--estado-alerta)"
      : "var(--color-muted)";
}

export function rotuloDe(estado: Estado): string {
  return OPCOES.find((o) => o.valor === estado)?.rotulo ?? "Disponível";
}

export function SeletorEstado({
  slug,
  estado,
}: {
  slug: string;
  estado: Estado;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState<Estado>(estado);
  const [pendente, iniciarTransicao] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  // Sincroniza caso a prop do servidor mude
  useEffect(() => setAtual(estado), [estado]);

  // Fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function escolher(proximo: Estado) {
    if (proximo === atual || pendente) return;

    const anterior = atual;
    // 1. Atualização OTIMISTA imediata na UI (0ms!)
    setAtual(proximo);
    setAberto(false);

    // 2. Persistência assíncrona no servidor e refresh de cache
    iniciarTransicao(async () => {
      try {
        const res = await mudarEstado(slug, proximo);
        if (res?.erro) {
          setAtual(anterior);
          return;
        }
        router.refresh();
      } catch {
        setAtual(anterior);
      }
    });
  }

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        disabled={pendente}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-busy={pendente}
        className="label flex items-center gap-2 border px-3 py-1.5 transition-all duration-200"
        style={{
          minHeight: 36,
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
          opacity: pendente ? 0.7 : 1,
        }}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: corDe(atual) }}
        />
        <span>{rotuloDe(atual)}</span>
        <span aria-hidden style={{ color: "var(--color-muted)" }}>
          ▾
        </span>
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-60 border shadow-[0_18px_40px_-24px_rgba(23,24,26,0.5)]"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {OPCOES.map((o) => {
            const isItemAtual = o.valor === atual;
            return (
              <button
                key={o.valor}
                type="button"
                role="menuitem"
                disabled={isItemAtual || pendente}
                onClick={() => escolher(o.valor)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--color-surface-2)] disabled:cursor-default"
                style={{ minHeight: 52 }}
              >
                <span
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color: isItemAtual
                      ? "var(--color-muted)"
                      : "var(--color-foreground)",
                  }}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: corDe(o.valor) }}
                  />
                  {o.rotulo}
                  {isItemAtual && " · atual"}
                </span>
                <span className="meta pl-4">{o.nota}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}