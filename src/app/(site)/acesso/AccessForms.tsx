"use client";

/**
 * Os dois formulários da porta: entrar e pedir acesso.
 *
 * Client component só pelo que exige interatividade — alternar entre as abas e
 * mostrar o estado de envio. As ações em si rodam no servidor.
 */

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { entrar, pedirAcesso, type EstadoForm } from "./actions";

const INICIAL: EstadoForm = {};

function Botao({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary justify-center">
      {pending ? "Um momento…" : children}
      {!pending && <span aria-hidden>→</span>}
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

function Aviso({ estado }: { estado: EstadoForm }) {
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

export function AccessForms({
  destino,
  estadoInicial,
}: {
  destino: string;
  /** Quando o middleware devolve alguém pendente, a tela já explica o porquê. */
  estadoInicial?: string;
}) {
  const [aba, setAba] = useState<"entrar" | "pedir">("entrar");
  const [login, acaoLogin] = useActionState(entrar, INICIAL);
  const [pedido, acaoPedido] = useActionState(pedirAcesso, INICIAL);

  const jaPendente = estadoInicial === "pendente";
  const acessoInativo =
    estadoInicial === "recusado" || estadoInicial === "inativo";

  return (
    <div className="flex flex-col gap-8">
      {jaPendente && (
        <p
          className="border-l-2 py-1 pl-3 text-sm"
          style={{ borderColor: "var(--color-accent-soft)" }}
        >
          Seu pedido de acesso está em análise. A casa entra em contato assim que
          avaliar.
        </p>
      )}

      {acessoInativo && (
        <p
          className="border-l-2 py-1 pl-3 text-sm"
          style={{ borderColor: "var(--color-border)" }}
        >
          Este acesso não está ativo. Fale com a casa para entender o estado do
          cadastro.
        </p>
      )}

      <div
        className="flex gap-6 border-b"
        style={{ borderColor: "var(--color-border)" }}
        role="tablist"
      >
        {(["entrar", "pedir"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={aba === v}
            onClick={() => setAba(v)}
            className="label -mb-px border-b-2 pb-3 transition-colors duration-300"
            style={{
              borderColor: aba === v ? "var(--color-foreground)" : "transparent",
              color:
                aba === v ? "var(--color-foreground)" : "var(--color-muted)",
            }}
          >
            {v === "entrar" ? "Entrar" : "Pedir acesso"}
          </button>
        ))}
      </div>

      {aba === "entrar" ? (
        <form action={acaoLogin} className="flex flex-col gap-5">
          <input type="hidden" name="destino" value={destino} />
          <Campo
            id="email"
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
          />
          <Campo
            id="senha"
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            required
          />
          <Aviso estado={login} />
          <Botao>Entrar</Botao>
        </form>
      ) : (
        <form action={acaoPedido} className="flex flex-col gap-5">
          <Campo
            id="nome"
            rotulo="Nome"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
          <Campo
            id="email"
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
          />
          <Campo
            id="telefone"
            rotulo="Telefone com DDD"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            required
          />
          <Campo
            id="observacao"
            rotulo="O que você procura (opcional)"
            placeholder="Submariner, Datejust two-tone…"
            maxLength={500}
          />
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] h-px w-px overflow-hidden"
          >
            <label htmlFor="empresa">Empresa</label>
            <input
              id="empresa"
              name="empresa"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <Aviso estado={pedido} />
          <Botao>Enviar pedido</Botao>
        </form>
      )}
    </div>
  );
}
