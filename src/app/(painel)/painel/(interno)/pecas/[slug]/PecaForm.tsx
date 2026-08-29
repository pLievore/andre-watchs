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

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  ["relogio-e-caixa", "Relógio e caixa"],
  ["somente-relogio", "Somente relógio"],
] as const;

const ESTADOS = [
  ["disponivel", "Disponível — à venda no acervo"],
  ["reservada", "Em negociação — aparece com selo, segue à venda"],
  ["vendida", "Vendida — fica no acervo como registro, sem CTA"],
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
  estado: string;
  consignada: boolean;
  historia: string | null;
  notas_estado: string | null;
}

function Campo({
  id,
  rotulo,
  dica,
  className,
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
      <input id={id} name={id} className={`campo ${className ?? ""}`.trim()} {...props} />
      {dica && <span className="meta">{dica}</span>}
    </div>
  );
}

function Selecao({
  id,
  rotulo,
  opcoes,
  padrao,
  valor,
  aoMudar,
}: {
  id: string;
  rotulo: string;
  opcoes: readonly (readonly [string, string])[];
  padrao?: string;
  valor?: string;
  aoMudar?: (v: string) => void;
}) {
  const isControlled = valor !== undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {rotulo}
      </label>
      <select
        id={id}
        name={id}
        value={isControlled ? valor : undefined}
        defaultValue={!isControlled ? padrao : undefined}
        onChange={(e) => aoMudar?.(e.target.value)}
        className="campo"
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
  const router = useRouter();
  const [estado, acao] = useActionState<EstadoPeca, FormData>(salvarPeca, {});
  const [condicao, setCondicao] = useState(peca.condicao);
  const [integralidade, setIntegralidade] = useState(peca.integralidade);
  const [estadoComercial, setEstadoComercial] = useState(peca.estado);

  // Sincroniza se a peça for recarregada do servidor
  useEffect(() => {
    setCondicao(peca.condicao);
    setIntegralidade(peca.integralidade);
    setEstadoComercial(peca.estado);
  }, [peca.condicao, peca.integralidade, peca.estado]);

  // Força revalidação do cache local no Next.js assim que salvar
  useEffect(() => {
    if (estado.sucesso) {
      router.refresh();
    }
  }, [estado.sucesso, router]);

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
        <Selecao
          id="condicao"
          rotulo="Condição"
          opcoes={CONDICOES}
          valor={condicao}
          aoMudar={setCondicao}
        />
        <Selecao
          id="integralidade"
          rotulo="O que acompanha"
          opcoes={INTEGRALIDADES}
          valor={integralidade}
          aoMudar={setIntegralidade}
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
            step="any"
            inputMode="decimal"
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
          inputMode="decimal"
          dica="Pode digitar como preferir: 215000, 215.000 ou 215.000,00"
          required
        />

        <Selecao
          id="estado"
          rotulo="Estado comercial"
          opcoes={ESTADOS}
          valor={estadoComercial}
          aoMudar={setEstadoComercial}
        />

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
            className="campo leading-relaxed"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notas_estado" className="label">
            Conservação — marcas de uso, o que o comprador precisa saber
          </label>
          <textarea
            id="notas_estado"
            name="notas_estado"
            rows={3}
            defaultValue={peca.notas_estado ?? ""}
            className="campo leading-relaxed"
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
                ? "var(--estado-erro)"
                : "var(--estado-ok)",
            }}
          >
            {estado.erro ?? estado.sucesso}
          </span>
        )}
      </div>
    </form>
  );
}
