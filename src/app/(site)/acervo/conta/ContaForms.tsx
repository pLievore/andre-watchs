"use client";

/**
 * Os dois formulários da conta: dados pessoais e senha.
 *
 * Mesmo padrão de `AccessForms.tsx` (Campo/Botao/Aviso) — mantém a mesma cara
 * em toda a área autenticada em vez de reinventar por tela.
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { atualizarDados, trocarSenha, type EstadoConta } from "./actions";

const INICIAL: EstadoConta = {};

function Botao({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary justify-center"
    >
      {pending ? "Um momento…" : children}
    </button>
  );
}

function Campo({
  id,
  rotulo,
  ...props
}: { id: string; rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="label">
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        className="border bg-transparent px-4 py-3 text-base"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
        {...props}
      />
    </div>
  );
}

function Aviso({ estado }: { estado: EstadoConta }) {
  if (!estado.erro && !estado.sucesso) return null;
  const erro = Boolean(estado.erro);
  return (
    <p
      role="status"
      className="border-l-2 py-1 pl-3 text-sm"
      style={{
        borderColor: erro ? "var(--color-error)" : "var(--color-success)",
        color: erro ? "var(--color-error)" : "var(--color-foreground)",
      }}
    >
      {estado.erro ?? estado.sucesso}
    </p>
  );
}

export function ContaForms({
  cliente,
}: {
  cliente: { nome: string; telefone: string; email: string };
}) {
  const [dados, acaoDados] = useActionState(atualizarDados, INICIAL);
  const [senha, acaoSenha] = useActionState(trocarSenha, INICIAL);

  return (
    <div className="flex flex-col gap-14">
      <form action={acaoDados} className="flex flex-col gap-5">
        <h2 className="label">Dados pessoais</h2>
        <Campo
          id="nome"
          rotulo="Nome"
          defaultValue={cliente.nome}
          autoComplete="name"
          minLength={2}
          maxLength={120}
          required
        />
        <div className="flex flex-col gap-2">
          <span className="label">E-mail</span>
          <p className="text-base" style={{ color: "var(--color-foreground)" }}>
            {cliente.email}
          </p>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            É o e-mail que você usa para entrar. Para trocar, fale com a casa.
          </p>
        </div>
        <Campo
          id="telefone"
          rotulo="Telefone com DDD"
          type="tel"
          inputMode="tel"
          defaultValue={cliente.telefone}
          autoComplete="tel"
          maxLength={30}
          required
        />
        <Aviso estado={dados} />
        <Botao>Salvar dados</Botao>
      </form>

      <form
        action={acaoSenha}
        className="flex flex-col gap-5 border-t pt-10"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="label">Trocar senha</h2>
        <Campo
          id="senha"
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Campo
          id="confirmacao"
          rotulo="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
        />
        <Aviso estado={senha} />
        <Botao>Trocar senha</Botao>
      </form>
    </div>
  );
}
