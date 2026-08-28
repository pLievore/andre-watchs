"use client";

/**
 * Escolha do estado comercial, direto da lista.
 *
 * Era um botão que alternava disponível/vendida a cada clique. Dois problemas:
 * o estado real tem três valores, e um botão que muda o dado no clique não
 * avisa para onde vai — quem quisesse marcar "vendida" tinha que adivinhar se
 * o clique ia levar para lá.
 *
 * Aqui o selo mostra o estado atual; o toque abre as três opções e a pessoa
 * escolhe. Fica claro o que é agora e o que dá para virar.
 */

import { useEffect, useRef, useState } from "react";

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
  return OPCOES.find((o) => o.valor === estado)!.rotulo;
}

export function SeletorEstado({
  slug,
  estado,
}: {
  slug: string;
  estado: Estado;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc — comportamento que todo menu tem e
  // cuja ausência faz o painel parecer quebrado.
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

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className="label flex items-center gap-2 border px-3 py-2 transition-colors duration-200"
        style={{
          minHeight: 40,
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: corDe(estado) }}
        />
        {rotuloDe(estado)}
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
            const atual = o.valor === estado;
            return (
              <form key={o.valor} action={mudarEstado}>
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="estado" value={o.valor} />
                <button
                  type="submit"
                  role="menuitem"
                  disabled={atual}
                  onClick={() => setAberto(false)}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--color-surface-2)] disabled:cursor-default"
                  style={{ minHeight: 52 }}
                >
                  <span
                    className="flex items-center gap-2 text-sm"
                    style={{
                      color: atual
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
                    {atual && " · atual"}
                  </span>
                  <span className="meta pl-4">{o.nota}</span>
                </button>
              </form>
            );
          })}
        </div>
      )}
    </div>
  );
}
