"use client";

/**
 * Os quatro status de um cliente, explícitos.
 *
 * O botão anterior alternava ativo/inativo e escondia que existem quatro
 * estados — "pendente" e "recusado" só apareciam vindos da fila de pedidos e
 * não havia como voltar a eles. Aqui cada opção diz o que significa para o
 * cliente, porque a diferença entre "recusado" e "inativo" é de intenção, não
 * de efeito: as duas barram o acesso, mas uma é "não quisemos" e a outra é
 * "não é mais".
 */

import { useEffect, useRef, useState } from "react";

import { mudarStatusCliente } from "./actions";

import {
  OPCOES_STATUS as OPCOES,
  corDoStatus,
  type Status,
  rotuloDoStatus,
} from "./status";

export type { Status };

export function SeletorStatus({ id, status }: { id: string; status: Status }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

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
        className="label flex items-center gap-2 border px-3 py-2"
        style={{
          minHeight: 40,
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
      >
        <span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: corDoStatus(status) }}
        />
        {rotuloDoStatus(status)}
        <span aria-hidden style={{ color: "var(--color-muted)" }}>
          ▾
        </span>
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 border shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {OPCOES.map((o) => {
            const atual = o.valor === status;
            return (
              <form key={o.valor} action={mudarStatusCliente}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value={o.valor} />
                <button
                  type="submit"
                  role="menuitem"
                  disabled={atual}
                  onClick={() => setAberto(false)}
                  className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-[var(--color-surface-2)] disabled:cursor-default"
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
                      style={{ background: corDoStatus(o.valor) }}
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
