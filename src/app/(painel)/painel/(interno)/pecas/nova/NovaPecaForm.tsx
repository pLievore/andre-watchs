"use client";

/**
 * Cadastro de peça — só o essencial.
 *
 * Deliberadamente curto. A peça é cadastrada no momento em que chega na mão do
 * Andre, e nesse momento ele sabe o que ela é e quanto vale, mas ainda não
 * conferiu calibre nem ano de cartão. Um formulário de dezesseis campos aqui
 * empurraria para o preenchimento por palpite — o erro que o SPEC §1.3 trata
 * como o mais caro do site.
 *
 * O resto entra na tela de edição, junto com as fotos, quando ele tiver os
 * dados na frente.
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { criarPeca, type EstadoPeca } from "../actions";

const CONDICOES = [
  ["seminovo", "Seminovo"],
  ["novo", "Novo"],
  ["pre-owned", "Pré-owned"],
] as const;

const INTEGRALIDADES = [
  ["full-set", "Full set"],
  ["caixa-e-papeis", "Caixa e papéis"],
  ["somente-relogio", "Somente relógio"],
] as const;

const ESTADOS = [
  ["disponivel", "Disponível"],
  ["reservada", "Em negociação"],
  ["vendida", "Vendida"],
] as const;

function Criar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Cadastrando…" : "Cadastrar e adicionar fotos"}
    </button>
  );
}

export function NovaPecaForm() {
  const [estado, acao] = useActionState<EstadoPeca, FormData>(criarPeca, {});

  return (
    <form action={acao} className="flex flex-col gap-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="marca" className="label">
            Marca
          </label>
          <input
            id="marca"
            name="marca"
            className="campo"
            required
            autoFocus
            placeholder="Rolex"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="modelo" className="label">
            Modelo
          </label>
          <input
            id="modelo"
            name="modelo"
            className="campo"
            required
            placeholder="Submariner Date"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="referencia" className="label">
          Referência
        </label>
        <input
          id="referencia"
          name="referencia"
          className="campo"
          placeholder="126610LN"
        />
        <span className="meta">
          Opcional — mas é ela que entra no endereço da peça. Deixe vazio se
          ainda não confirmou.
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="condicao" className="label">
            Condição
          </label>
          <select id="condicao" name="condicao" className="campo">
            {CONDICOES.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="integralidade" className="label">
            O que acompanha
          </label>
          <select id="integralidade" name="integralidade" className="campo">
            {INTEGRALIDADES.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="preco" className="label">
            Preço
          </label>
          <input
            id="preco"
            name="preco"
            className="campo"
            required
            inputMode="decimal"
            placeholder="215.000"
          />
          <span className="meta">
            Digite como preferir: 215000, 215.000 ou 215.000,00
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="estado" className="label">
            Estado
          </label>
          <select id="estado" name="estado" className="campo">
            {ESTADOS.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
          <span className="meta">
            Dá para trocar a qualquer momento, direto da lista.
          </span>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" name="consignada" className="h-4 w-4" />
        Peça em consignação
      </label>

      <div className="flex items-center gap-4">
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
