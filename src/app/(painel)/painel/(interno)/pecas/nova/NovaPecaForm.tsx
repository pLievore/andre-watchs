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
 * O restante das especificações entra na tela de edição quando ele tiver os
 * dados na frente. As fotos já podem acompanhar o cadastro inicial.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { criarPeca, type EstadoPeca } from "../actions";
import { MAX_FOTOS, validarArquivosFoto } from "../fotos-config";
import {
  enviarArquivosDaPeca,
  type ProgressoUpload,
} from "../upload-client";

const CONDICOES = [
  ["seminovo", "Seminovo"],
  ["novo", "Novo"],
  ["pre-owned", "Pré-owned"],
] as const;

const INTEGRALIDADES = [
  ["full-set", "Full set"],
  ["caixa-e-papeis", "Caixa e papéis"],
  ["relogio-e-caixa", "Relógio e caixa"],
  ["somente-relogio", "Somente relógio"],
] as const;

const ESTADOS = [
  ["disponivel", "Disponível"],
  ["reservada", "Em negociação"],
  ["vendida", "Vendida"],
] as const;

type Etapa = "ocioso" | "criando" | "enviando";

function textoDoBotao(
  etapa: Etapa,
  progresso: ProgressoUpload | null,
  quantidade: number,
) {
  if (etapa === "criando") return "Cadastrando…";
  if (etapa === "enviando") {
    if (progresso?.etapa === "registrando") return "Registrando fotos…";
    if (progresso?.etapa === "enviando") {
      return `Enviando ${progresso.concluidas} de ${progresso.total}…`;
    }
    return "Preparando fotos…";
  }
  if (quantidade === 0) return "Cadastrar peça";
  return `Cadastrar com ${quantidade} foto${quantidade === 1 ? "" : "s"}`;
}

function Criar({
  etapa,
  progresso,
  quantidade,
  disabled,
}: {
  etapa: Etapa;
  progresso: ProgressoUpload | null;
  quantidade: number;
  disabled: boolean;
}) {
  return (
    <button type="submit" disabled={disabled} className="btn btn-primary">
      {textoDoBotao(etapa, progresso, quantidade)}
    </button>
  );
}

export function NovaPecaForm() {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoPeca>({});
  const [etapa, setEtapa] = useState<Etapa>("ocioso");
  const [escolhidas, setEscolhidas] = useState<File[]>([]);
  const [progresso, setProgresso] = useState<ProgressoUpload | null>(null);
  const [pecaCriada, setPecaCriada] = useState<string | null>(null);

  const pendente = etapa !== "ocioso";

  async function aoEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendente || pecaCriada) return;

    if (escolhidas.length > 0) {
      const erroFotos = validarArquivosFoto(
        escolhidas.map((arquivo) => ({
          nome: arquivo.name,
          tipo: arquivo.type,
          tamanho: arquivo.size,
        })),
        0,
      );
      if (erroFotos) {
        setEstado({ erro: erroFotos });
        return;
      }
    }

    setEstado({});
    setEtapa("criando");
    const dados = new FormData(event.currentTarget);
    // Os bytes não podem entrar na Server Action — upload direto ao Storage.
    dados.delete("fotos");
    const criada = await criarPeca({}, dados);

    if (criada.erro || !criada.slug) {
      setEstado({ erro: criada.erro ?? "Não foi possível cadastrar a peça." });
      setEtapa("ocioso");
      return;
    }

    setPecaCriada(criada.slug);

    if (escolhidas.length === 0) {
      router.push(`/painel/pecas/${criada.slug}?nova=1`);
      return;
    }

    setEtapa("enviando");
    const envio = await enviarArquivosDaPeca({
      slug: criada.slug,
      arquivos: escolhidas,
      jaTem: 0,
      onProgresso: setProgresso,
    });

    if (envio.erro) {
      // A peça existir sem foto é um estado suportado. Impedir novo submit evita
      // duplicá-la; o link leva ao gerenciador para tentar só as fotos de novo.
      setEstado({
        erro: `A peça foi cadastrada sem fotos. ${envio.erro}`,
      });
      setEtapa("ocioso");
      return;
    }

    router.push(
      `/painel/pecas/${criada.slug}?nova=1&fotos=${escolhidas.length}`,
    );
    router.refresh();
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-8">
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

      <div
        className="flex flex-col gap-3 border border-dashed p-5"
        style={{ borderColor: "var(--color-border)" }}
      >
        <label htmlFor="fotos" className="label">
          Fotos da peça
        </label>
        <input
          id="fotos"
          name="fotos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={pendente || Boolean(pecaCriada)}
          onChange={(event) => {
            const arquivos = Array.from(event.target.files ?? []);
            setEscolhidas(arquivos);
            const erro =
              arquivos.length > 0
                ? validarArquivosFoto(
                    arquivos.map((arquivo) => ({
                      nome: arquivo.name,
                      tipo: arquivo.type,
                      tamanho: arquivo.size,
                    })),
                    0,
                  )
                : null;
            setEstado(erro ? { erro } : {});
          }}
          className="text-sm"
        />
        <span className="meta">
          JPG, PNG, WebP ou AVIF, até 10 MB cada. Escolha até {MAX_FOTOS}; a
          primeira vira a capa. Você poderá trocar, descrever e reordenar depois.
        </span>
        {escolhidas.length > 0 && (
          <span className="meta">
            {escolhidas.length} selecionada{escolhidas.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {!pecaCriada && (
          <Criar
            etapa={etapa}
            progresso={progresso}
            quantidade={escolhidas.length}
            disabled={pendente}
          />
        )}
        {estado.erro && (
          <span
            role="status"
            className="text-sm"
            style={{ color: "var(--estado-erro)" }}
          >
            {estado.erro}
          </span>
        )}
        {pecaCriada && estado.erro && (
          <Link
            href={`/painel/pecas/${pecaCriada}?nova=1`}
            className="btn btn-ghost"
          >
            Abrir a peça e tentar as fotos novamente
          </Link>
        )}
      </div>
    </form>
  );
}
