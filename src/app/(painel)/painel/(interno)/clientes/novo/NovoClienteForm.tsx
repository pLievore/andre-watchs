"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { criarCliente, type EstadoCliente } from "../actions";

function Criar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Cadastrando…" : "Cadastrar cliente"}
    </button>
  );
}

export function NovoClienteForm() {
  const [estado, acao] = useActionState<EstadoCliente, FormData>(
    criarCliente,
    {},
  );

  return (
    <form action={acao} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nome" className="label">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          className="campo"
          placeholder="Nome completo"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="label">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="campo"
          />
          <span className="meta">É com ele que o cliente entra.</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="telefone" className="label">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            required
            inputMode="tel"
            className="campo"
            placeholder="11 98765-4321"
          />
          <span className="meta">Contato do cliente para suporte e WhatsApp.</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="label">
          Acesso
        </label>
        <select id="status" name="status" className="campo" defaultValue="ativo">
          <option value="ativo">Com acesso — entra agora</option>
          <option value="pendente">Em análise — cadastra sem liberar</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="observacao" className="label">
          Observações
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={3}
          maxLength={500}
          className="campo leading-relaxed"
          placeholder="Quem indicou, o que procura, o que já conversaram."
        />
        <span className="meta">Só a casa vê.</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Criar />
        {estado.erro && (
          <span
            role="status"
            className="text-sm"
            style={{ color: "var(--estado-erro)" }}
          >
            {estado.erro}
          </span>
        )}
      </div>
    </form>
  );
}
