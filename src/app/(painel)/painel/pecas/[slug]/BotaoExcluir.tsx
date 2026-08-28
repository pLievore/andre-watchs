"use client";

/**
 * Exclusão de peça, com confirmação por digitação.
 *
 * `confirm()` seria mais curto, mas um diálogo do navegador é dispensado por
 * reflexo — e esta ação apaga a peça e todas as fotos sem volta. Obrigar a
 * escrever o nome garante que quem confirmou leu o que ia apagar.
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { excluirPeca } from "../actions";

function Confirmar({ liberado }: { liberado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!liberado || pending}
      className="label border px-4 py-2 disabled:opacity-40"
      style={{
        minHeight: 44,
        borderColor: "var(--estado-erro)",
        color: "var(--estado-erro)",
      }}
    >
      {pending ? "Excluindo…" : "Excluir definitivamente"}
    </button>
  );
}

export function BotaoExcluir({
  slug,
  nome,
}: {
  slug: string;
  nome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="label border px-4 py-2 self-start"
        style={{
          minHeight: 44,
          borderColor: "var(--color-border)",
          color: "var(--estado-erro)",
        }}
      >
        Excluir esta peça
      </button>
    );
  }

  return (
    <form action={excluirPeca} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />

      <label htmlFor="confirmacao" className="meta">
        Para confirmar, digite <strong>{nome}</strong>
      </label>
      <input
        id="confirmacao"
        value={digitado}
        onChange={(e) => setDigitado(e.target.value)}
        className="campo max-w-sm"
        autoComplete="off"
        autoFocus
      />

      <div className="flex flex-wrap items-center gap-3">
        <Confirmar liberado={digitado.trim() === nome} />
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setDigitado("");
          }}
          className="label px-3"
          style={{ minHeight: 44, color: "var(--color-muted)" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
