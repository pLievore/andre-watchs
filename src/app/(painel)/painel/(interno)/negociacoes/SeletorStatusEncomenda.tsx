"use client";

import { useTransition } from "react";
import { mudarStatusEncomenda } from "./actions";

export function SeletorStatusEncomenda({
  id,
  statusAtual,
}: {
  id: string;
  statusAtual: "em_busca" | "atendido" | "cancelado";
}) {
  const [pendente, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const novoStatus = e.target.value as "em_busca" | "atendido" | "cancelado";
    startTransition(async () => {
      await mudarStatusEncomenda(id, novoStatus);
    });
  }

  const corStatus = {
    em_busca: "var(--color-accent)",
    atendido: "var(--estado-ok)",
    cancelado: "var(--color-muted)",
  }[statusAtual];

  return (
    <select
      value={statusAtual}
      disabled={pendente}
      onChange={handleChange}
      className="border px-2.5 py-1 text-xs font-mono uppercase tracking-wider outline-none cursor-pointer"
      style={{
        borderColor: corStatus,
        background: "var(--color-surface)",
        color: corStatus,
        opacity: pendente ? 0.5 : 1,
      }}
    >
      <option value="em_busca">Em busca</option>
      <option value="atendido">Atendido</option>
      <option value="cancelado">Cancelado</option>
    </select>
  );
}