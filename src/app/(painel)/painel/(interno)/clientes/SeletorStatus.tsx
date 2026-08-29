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

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { mudarStatusCliente } from "./actions";

import {
  OPCOES_STATUS as OPCOES,
  corDoStatus,
  type Status,
  rotuloDoStatus,
} from "./status";

export type { Status };

export function SeletorStatus({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState(status);
  const [mensagem, setMensagem] = useState("");
  const [pendente, iniciarTransicao] = useTransition();
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => setAtual(status), [status]);

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

  function escolher(proximo: Status) {
    if (proximo === atual || pendente) return;

    const anterior = atual;
    setAtual(proximo);
    setMensagem("");
    setAberto(false);

    iniciarTransicao(async () => {
      try {
        const resultado = await mudarStatusCliente(id, proximo);
        if (resultado.erro) {
          setAtual(anterior);
          setMensagem(resultado.erro);
          return;
        }
        setMensagem(resultado.sucesso ?? "Status atualizado.");
        router.refresh();
      } catch {
        setAtual(anterior);
        setMensagem("Não foi possível mudar o status. Tente de novo.");
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
          style={{ background: corDoStatus(atual) }}
        />
        {pendente ? "Salvando…" : rotuloDoStatus(atual)}
        <span aria-hidden style={{ color: "var(--color-muted)" }}>
          ▾
        </span>
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute left-0 sm:left-auto sm:right-0 z-30 mt-1 w-64 max-w-[calc(100vw-2.5rem)] border shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {OPCOES.map((o) => {
            const selecionado = o.valor === atual;
            return (
              <button
                key={o.valor}
                type="button"
                role="menuitem"
                disabled={selecionado || pendente}
                onClick={() => escolher(o.valor)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-[var(--color-surface-2)] disabled:cursor-default"
                style={{ minHeight: 52 }}
              >
                <span
                  className="flex items-center gap-2 text-sm"
                  style={{
                    color: selecionado
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
                  {selecionado && " · atual"}
                </span>
                <span className="meta pl-4">{o.nota}</span>
              </button>
            );
          })}
        </div>
      )}

      {mensagem && (
        <span
          role="status"
          className="absolute left-0 sm:left-auto sm:right-0 top-full z-20 mt-2 w-64 text-left sm:text-right text-xs"
          style={{
            color: mensagem.startsWith("Status")
              ? "var(--estado-ok)"
              : "var(--estado-erro)",
          }}
        >
          {mensagem}
        </span>
      )}
    </div>
  );
}
