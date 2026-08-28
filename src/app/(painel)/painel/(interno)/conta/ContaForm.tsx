"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { trocarSenhaAdmin, type EstadoConta } from "./actions";

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary self-start">
      {pending ? "Salvando…" : "Trocar senha"}
    </button>
  );
}

export function ContaForm() {
  const [estado, acao] = useActionState<EstadoConta, FormData>(
    trocarSenhaAdmin,
    {},
  );

  return (
    <form action={acao} className="flex max-w-sm flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="label">
          Nova senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          className="campo"
        />
        <span className="meta">
          Ao menos 10 caracteres — esta senha abre o acervo e os dados de todos
          os clientes.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmacao" className="label">
          Repita a nova senha
        </label>
        <input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          className="campo"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Salvar />
        {(estado.erro || estado.sucesso) && (
          <span
            role="status"
            className="text-sm"
            style={{
              color: estado.erro ? "var(--estado-erro)" : "var(--estado-ok)",
            }}
          >
            {estado.erro ?? estado.sucesso}
          </span>
        )}
      </div>
    </form>
  );
}
