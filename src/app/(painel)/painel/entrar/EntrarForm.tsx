"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { entrarNoPainel, type EstadoEntrada } from "./actions";

function Entrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary w-full justify-center"
      style={{ minHeight: 48 }}
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function EntrarForm({ destino }: { destino: string }) {
  const [estado, acao] = useActionState<EstadoEntrada, FormData>(
    entrarNoPainel,
    {},
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      <input type="hidden" name="destino" value={destino} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="campo"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="label">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="campo"
        />
      </div>

      <Entrar />

      {estado.erro && (
        <p
          role="alert"
          className="text-sm"
          style={{ color: "var(--estado-erro)" }}
        >
          {estado.erro}
        </p>
      )}
    </form>
  );
}
