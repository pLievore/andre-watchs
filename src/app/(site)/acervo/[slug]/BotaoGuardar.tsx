"use client";

/**
 * "Guardar" na página da peça.
 *
 * Responde na hora e conserta depois: o estado vira no toque, e só volta atrás
 * se o servidor recusar. Guardar é gesto leve — esperar meio segundo por um
 * coração aceso mataria a leveza que faz dele um gesto.
 *
 * O dono não vê este botão: ele não é cliente da casa, e uma lista de desejos
 * do próprio acervo não quer dizer nada.
 */

import { useState, useTransition } from "react";

import { alternarGuardada } from "../guardadas-actions";
import { dispararVibracao } from "@/lib/haptics";

export function BotaoGuardar({
  pecaId,
  inicial,
}: {
  pecaId: string;
  inicial: boolean;
}) {
  const [guardada, setGuardada] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function alternar() {
    const anterior = guardada;
    setGuardada(!anterior);
    setErro(null);
    dispararVibracao(8);

    iniciar(async () => {
      const resposta = await alternarGuardada(pecaId);
      if (resposta.erro) {
        setGuardada(anterior);
        setErro(resposta.erro);
        return;
      }
      if (typeof resposta.guardada === "boolean") {
        setGuardada(resposta.guardada);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={alternar}
        aria-pressed={guardada}
        className="flex items-center justify-center gap-2 border py-3 text-sm transition-colors"
        style={{
          borderColor: guardada
            ? "var(--color-foreground)"
            : "var(--color-border)",
          background: guardada ? "var(--color-surface)" : "transparent",
          color: guardada ? "var(--color-foreground)" : "var(--color-muted)",
          transitionTimingFunction: "var(--ease-editorial)",
          opacity: pendente ? 0.7 : 1,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill={guardada ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.2L5 21V4.5a1 1 0 0 1 1-1Z" />
        </svg>
        <span>{guardada ? "Guardada" : "Guardar esta peça"}</span>
      </button>

      {erro ? (
        <p className="meta text-xs" role="status">
          {erro}
        </p>
      ) : (
        <p className="meta text-xs">
          {guardada
            ? "Ela fica na sua lista. A casa sabe que você está de olho."
            : "Fica salva para você voltar, sem falar com ninguém agora."}
        </p>
      )}
    </div>
  );
}
