"use client";

/**
 * Formulários da ficha do cliente.
 *
 * São quatro, separados de propósito, e não um só com um botão "salvar tudo":
 * cada um tem uma consequência diferente. Corrigir um telefone é rotina; trocar
 * o e-mail muda como a pessoa entra no site; redefinir a senha derruba o acesso
 * atual dela. Juntar os três num botão faria alguém disparar todos ao querer
 * arrumar só um.
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  redefinirSenhaCliente,
  salvarCliente,
  trocarEmailCliente,
  type EstadoCliente,
} from "../actions";

function Botao({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary self-start"
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

function Recado({ estado }: { estado: EstadoCliente }) {
  if (!estado.erro && !estado.sucesso) return null;
  return (
    <span
      role="status"
      className="text-sm"
      style={{
        color: estado.erro ? "var(--estado-erro)" : "var(--estado-ok)",
      }}
    >
      {estado.erro ?? estado.sucesso}
    </span>
  );
}

/* ── Dados de cadastro ──────────────────────────────────────────────────── */

export function DadosForm({
  id,
  nome,
  telefone,
  observacao,
}: {
  id: string;
  nome: string;
  telefone: string | null;
  observacao: string | null;
}) {
  const [estado, acao] = useActionState<EstadoCliente, FormData>(
    salvarCliente,
    {},
  );

  return (
    <form action={acao} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="id" value={id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="nome" className="label">
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            defaultValue={nome}
            required
            className="campo"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="telefone" className="label">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={telefone ?? ""}
            required
            inputMode="tel"
            className="campo"
          />
        </div>
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
          defaultValue={observacao ?? ""}
          className="campo leading-relaxed"
          placeholder="O que a casa sabe sobre este cliente — indicação, preferências, histórico."
        />
        <span className="meta">Só a casa vê. O cliente nunca lê isto.</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Botao>Salvar dados</Botao>
        <Recado estado={estado} />
      </div>
    </form>
  );
}

/* ── E-mail de acesso ───────────────────────────────────────────────────── */

export function EmailForm({ id, email }: { id: string; email: string }) {
  const [estado, acao] = useActionState<EstadoCliente, FormData>(
    trocarEmailCliente,
    {},
  );

  return (
    <form action={acao} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="id" value={id} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="label">
          E-mail de acesso
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={email}
          required
          className="campo"
        />
        <span className="meta">
          É com este e-mail que ele entra no site. Trocar aqui muda o login.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Botao>Trocar e-mail</Botao>
        <Recado estado={estado} />
      </div>
    </form>
  );
}

/* ── Senha ──────────────────────────────────────────────────────────────── */

export function SenhaForm({ id }: { id: string }) {
  const [estado, acao] = useActionState<EstadoCliente, FormData>(
    redefinirSenhaCliente,
    {},
  );
  const [modo, setModo] = useState<"telefone" | "manual">("telefone");

  return (
    <form action={acao} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modo" value={modo} />

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="radio"
            name="escolha"
            checked={modo === "telefone"}
            onChange={() => setModo("telefone")}
            className="mt-1 h-4 w-4"
          />
          <span>
            Voltar a senha para o telefone
            <span className="meta block">
              É a senha inicial de todo cliente. Dá para ditar no WhatsApp sem
              constrangimento.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="radio"
            name="escolha"
            checked={modo === "manual"}
            onChange={() => setModo("manual")}
            className="mt-1 h-4 w-4"
          />
          <span>Definir uma senha específica</span>
        </label>
      </div>

      {modo === "manual" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="senha" className="label">
            Nova senha
          </label>
          <input
            id="senha"
            name="senha"
            type="text"
            minLength={6}
            required
            autoComplete="off"
            className="campo"
          />
          <span className="meta">
            Em texto claro de propósito: você vai precisar ditar para ele.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Botao>Redefinir senha</Botao>
        <Recado estado={estado} />
      </div>
    </form>
  );
}
