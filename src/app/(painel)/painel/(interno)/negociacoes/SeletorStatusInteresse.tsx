"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  mudarStatusInteresse,
  type StatusInteresse,
} from "./actions";

const STATUS_CONFIG: Record<
  StatusInteresse,
  { label: string; selo: string; cor: string }
> = {
  em_conversa: {
    label: "Em conversa",
    selo: "selo-alerta",
    cor: "var(--estado-alerta)",
  },
  negociando: {
    label: "Negociando",
    selo: "selo-alerta",
    cor: "var(--color-accent)",
  },
  vendido: {
    label: "Vendido",
    selo: "selo-ok",
    cor: "var(--estado-ok)",
  },
  perdido: {
    label: "Perdido",
    selo: "selo-erro",
    cor: "var(--estado-erro)",
  },
};

export function SeletorStatusInteresse({
  id,
  statusAtual,
}: {
  id: string;
  statusAtual: StatusInteresse;
}) {
  const router = useRouter();
  const [atual, setAtual] = useState<StatusInteresse>(statusAtual);
  const [pendente, iniciarTransicao] = useTransition();

  function mudar(novo: StatusInteresse) {
    if (novo === atual || pendente) return;
    const anterior = atual;
    setAtual(novo);

    iniciarTransicao(async () => {
      const res = await mudarStatusInteresse(id, novo);
      if (res.erro) {
        setAtual(anterior);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={atual}
        disabled={pendente}
        onChange={(e) => mudar(e.target.value as StatusInteresse)}
        className="campo text-xs py-1.5 px-2.5 cursor-pointer font-medium"
        style={{
          width: "auto",
          minHeight: 34,
          borderColor: STATUS_CONFIG[atual].cor,
          color: STATUS_CONFIG[atual].cor,
          background: "var(--color-surface)",
        }}
      >
        <option value="em_conversa">Em conversa (WhatsApp)</option>
        <option value="negociando">Negociando (Proposta)</option>
        <option value="vendido">Vendido ✓</option>
        <option value="perdido">Perdido ✕</option>
      </select>
      {pendente && <span className="meta text-xs">Salvando…</span>}
    </div>
  );
}