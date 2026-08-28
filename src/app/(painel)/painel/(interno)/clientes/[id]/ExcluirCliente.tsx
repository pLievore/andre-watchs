"use client";

/**
 * Exclusão definitiva de cliente.
 *
 * Fecha por padrão e exige o nome digitado. É a única operação do painel que
 * destrói dado de pessoa — e a alternativa certa, "inativo", quase sempre
 * resolve, então a tela precisa deixar o desvio mais fácil que o caminho.
 */

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { excluirCliente } from "../actions";

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

export function ExcluirCliente({ id, nome }: { id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="label self-start border px-4 py-2"
        style={{
          minHeight: 44,
          borderColor: "var(--color-border)",
          color: "var(--estado-erro)",
        }}
      >
        Excluir cliente
      </button>
    );
  }

  return (
    <form action={excluirCliente} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

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
