"use client";

import { useActionState } from "react";

import { resgatarConvite, type EstadoResgate } from "./actions";

export function FormConvite({
  token,
  nomeSugerido,
}: {
  token: string;
  nomeSugerido?: string | null;
}) {
  const acaoVinculada = resgatarConvite.bind(null, token);
  const [estado, acao, pendente] = useActionState<EstadoResgate, FormData>(
    acaoVinculada,
    {},
  );

  return (
    <form
      action={acao}
      className="mt-8 flex flex-col gap-5 border p-6 md:p-8"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      <div className="flex flex-col gap-1 border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
        <h2
          className="label text-sm uppercase tracking-wider"
          style={{ color: "var(--color-foreground)" }}
        >
          Cadastro de membro
        </h2>
        <p className="meta">
          Preencha seus dados para ativar sua credencial no acervo reservado.
        </p>
      </div>

      <label className="flex flex-col gap-1.5" htmlFor="nome">
        <span className="label">Nome completo</span>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={nomeSugerido || ""}
          placeholder="Como prefere ser chamado"
          className="campo"
          disabled={pendente}
        />
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="email">
        <span className="label">E-mail</span>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          className="campo"
          disabled={pendente}
        />
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="telefone">
        <span className="label">Telefone / WhatsApp</span>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          className="campo"
          disabled={pendente}
        />
      </label>

      <label className="flex flex-col gap-1.5" htmlFor="senha">
        <div className="flex items-center justify-between">
          <span className="label">Senha de acesso</span>
          <span className="meta text-xs">mínimo 6 caracteres</span>
        </div>
        <input
          id="senha"
          name="senha"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Crie sua senha pessoal"
          className="campo"
          disabled={pendente}
        />
        <span className="meta text-xs">
          Dica: você pode usar seu telefone como senha ou definir uma senha exclusiva.
        </span>
      </label>

      {estado.erro && (
        <p
          role="alert"
          className="text-xs border p-3"
          style={{
            borderColor: "var(--estado-erro)",
            color: "var(--estado-erro)",
            background: "var(--color-background)",
          }}
        >
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary mt-3 w-full justify-center"
        style={{ minHeight: 46 }}
      >
        {pendente ? "Ativando seu acesso…" : "Ativar acesso ao acervo"}
      </button>
    </form>
  );
}