"use client";

/**
 * Formulário de edição de peça.
 *
 * Client component pelo estado de envio e pela mensagem de retorno; a escrita
 * acontece na Server Action.
 *
 * Os campos de especificação podem ficar vazios de propósito — SPEC §1.3:
 * publicar referência errada é pior que publicar sem referência, e a UI já
 * sabe mostrar `—`. Nenhum deles é obrigatório.
 */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { salvarPeca, type EstadoPeca } from "../actions";

const CONDICOES = [
  ["novo", "Novo"],
  ["seminovo", "Seminovo"],
  ["pre-owned", "Pré-owned"],
] as const;

const INTEGRALIDADES = [
  ["full-set", "Full set"],
  ["caixa-e-papeis", "Caixa e papéis"],
  ["somente-relogio", "Somente relógio"],
] as const;

export interface PecaEditavel {
  slug: string;
  marca: string;
  modelo: string;
  condicao: string;
  integralidade: string;
  referencia: string | null;
  calibre: string | null;
  diametro_mm: number | null;
  material_caixa: string | null;
  pulseira: string | null;
  mostrador: string | null;
  ano_cartao: number | null;
  preco_centavos: number;
  disponivel: boolean;
  consignada: boolean;
  historia: string | null;
  notas_estado: string | null;
}

const entrada =
  "border bg-transparent px-3 py-2.5 text-base";
const estiloEntrada = {
  borderColor: "var(--color-border)",
  color: "var(--color-foreground)",
};

function Campo({
  id,
  rotulo,
  dica,
  ...props
}: {
  id: string;
  rotulo: string;
  dica?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {rotulo}
      </label>
      <input id={id} name={id} className={entrada} style={estiloEntrada} {...props} />
      {dica && <span className="meta">{dica}</span>}
    </div>
  );
}

function Selecao({
  id,
  rotulo,
  opcoes,
  padrao,
}: {
  id: string;
  rotulo: string;
  opcoes: readonly (readonly [string, string])[];
  padrao: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={padrao}
        className={entrada}
        style={estiloEntrada}
      >
        {opcoes.map(([v, r]) => (
          <option key={v} value={v} style={{ background: "var(--color-surface)" }}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}

function Salvar() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary">
      {pending ? "Salvando…" : "Salvar"}
    </button>
  );
}

export function PecaForm({ peca }: { peca: PecaEditavel }) {
  const [estado, acao] = useActionState<EstadoPeca, FormData>(salvarPeca, {});

  // Centavos viram "215000,00" no campo — o parser da action aceita de volta
  // em qualquer formato que o Andre digitar.
  const precoInicial = (peca.preco_centavos / 100).toFixed(2).replace(".", ",");

  return (
    <form action={acao} className="flex flex-col gap-8">
      <input type="hidden" name="slug" value={peca.slug} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="marca" rotulo="Marca" defaultValue={peca.marca} required />
        <Campo id="modelo" rotulo="Modelo" defaultValue={peca.modelo} required />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Selecao id="condicao" rotulo="Condição" opcoes={CONDICOES} padrao={peca.condicao} />
        <Selecao
          id="integralidade"
          rotulo="O que acompanha"
          opcoes={INTEGRALIDADES}
          padrao={peca.integralidade}
        />
      </div>

      <fieldset
        className="flex flex-col gap-5 border-t pt-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <legend className="label">
          Especificações — deixe vazio o que não estiver confirmado
        </legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            id="referencia"
            rotulo="Referência"
            defaultValue={peca.referencia ?? ""}
            placeholder="126610LN"
          />
          <Campo
            id="calibre"
            rotulo="Calibre"
            defaultValue={peca.calibre ?? ""}
            placeholder="3235"
          />
          <Campo
            id="diametro_mm"
            rotulo="Diâmetro (mm)"
            type="number"
            inputMode="numeric"
            defaultValue={peca.diametro_mm ?? ""}
            placeholder="41"
          />
          <Campo
            id="ano_cartao"
            rotulo="Ano do cartão"
            type="number"
            inputMode="numeric"
            defaultValue={peca.ano_cartao ?? ""}
            placeholder="2023"
          />
          <Campo
            id="material_caixa"
            rotulo="Material da caixa"
            defaultValue={peca.material_caixa ?? ""}
            placeholder="aco-904l, two-tone, ouro-amarelo…"
          />
          <Campo
            id="pulseira"
            rotulo="Pulseira"
            defaultValue={peca.pulseira ?? ""}
            placeholder="oyster, jubilee, president…"
          />
        </div>

        <Campo
          id="mostrador"
          rotulo="Mostrador"
          defaultValue={peca.mostrador ?? ""}
          placeholder="preto com bezel verde"
        />
      </fieldset>

      <div
        className="flex flex-col gap-5 border-t pt-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Campo
          id="preco"
          rotulo="Preço"
          defaultValue={precoInicial}
          dica="Pode digitar como preferir: 215000, 215.000 ou 215.000,00"
          required
        />

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="disponivel"
              defaultChecked={peca.disponivel}
              className="h-4 w-4"
            />
            Disponível no acervo
          </label>
          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="consignada"
              defaultChecked={peca.consignada}
              className="h-4 w-4"
            />
            Peça em consignação
          </label>
        </div>
      </div>

      <div
        className="flex flex-col gap-5 border-t pt-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="historia" className="label">
            A peça
          </label>
          <textarea
            id="historia"
            name="historia"
            rows={4}
            defaultValue={peca.historia ?? ""}
            className={`${entrada} leading-relaxed`}
            style={estiloEntrada}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notas_estado" className="label">
            Estado — marcas de uso, o que o comprador precisa saber
          </label>
          <textarea
            id="notas_estado"
            name="notas_estado"
            rows={3}
            defaultValue={peca.notas_estado ?? ""}
            className={`${entrada} leading-relaxed`}
            style={estiloEntrada}
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Salvar />
        {(estado.erro || estado.sucesso) && (
          <span
            role="status"
            className="text-sm"
            style={{
              color: estado.erro
                ? "var(--color-error)"
                : "var(--color-muted)",
            }}
          >
            {estado.erro ?? estado.sucesso}
          </span>
        )}
      </div>
    </form>
  );
}
