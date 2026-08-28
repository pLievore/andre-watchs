"use client";

/**
 * Fotos da peça: enviar, ordenar, descrever, apagar.
 *
 * A ordem é o contrato com a vitrine — a primeira foto é a capa do card, a
 * segunda é o crossfade do hover, o resto é galeria. Como isso não é óbvio,
 * a UI rotula cada posição em vez de mostrar só uma lista numerada.
 *
 * Sem drag-and-drop de propósito: metade do uso é no celular, com uma mão, e
 * arrastar em tela sensível ao toque erra mais do que acerta. Setas acertam
 * sempre.
 */

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  enviarFotos,
  excluirFoto,
  moverFoto,
  salvarAlt,
  type EstadoFoto,
} from "../fotos-actions";

export interface FotoPainel {
  id: string;
  url: string;
  alt: string;
  ordem: number;
}

const MAX_FOTOS = 8;

function papelDa(indice: number): string {
  return indice === 0
    ? "Capa — é esta que aparece no card"
    : indice === 1
      ? "Segunda — aparece no hover do card"
      : "Galeria";
}

function Enviar({ vazio }: { vazio: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || vazio}
      className="btn btn-primary"
      style={{ opacity: vazio && !pending ? 0.5 : 1 }}
    >
      {pending ? "Enviando…" : "Enviar fotos"}
    </button>
  );
}

export function GerenciadorFotos({
  slug,
  fotos,
}: {
  slug: string;
  fotos: FotoPainel[];
}) {
  const [estado, acao] = useActionState<EstadoFoto, FormData>(enviarFotos, {});
  const [escolhidas, setEscolhidas] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const restam = MAX_FOTOS - fotos.length;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label">Fotos</h2>
        <span className="meta">
          {fotos.length} de {MAX_FOTOS}
        </span>
      </div>

      {fotos.length === 0 && (
        <p
          className="border px-5 py-4 text-sm"
          style={{
            borderColor: "var(--estado-alerta)",
            color: "var(--color-foreground)",
          }}
        >
          Esta peça está no acervo sem foto. Ela aparece com o desenho de
          placeholder — funciona, mas não vende.
        </p>
      )}

      {fotos.length > 0 && (
        <ul className="flex flex-col gap-4">
          {fotos.map((f, i) => (
            <li
              key={f.id}
              className="flex flex-col gap-4 border p-4 sm:flex-row"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="relative aspect-[4/5] w-full shrink-0 overflow-hidden sm:w-32"
                style={{ background: "var(--color-surface-2)" }}
              >
                {f.url ? (
                  <Image
                    src={f.url}
                    alt={f.alt}
                    fill
                    sizes="128px"
                    className="object-cover"
                    // Link assinado, com validade — o Next não deve guardar.
                    unoptimized
                  />
                ) : (
                  <span className="meta absolute inset-0 grid place-items-center">
                    sem prévia
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <span
                  className="meta"
                  style={{
                    color: i < 2 ? "var(--color-accent)" : "var(--color-muted)",
                  }}
                >
                  {papelDa(i)}
                </span>

                {/*
                  O alt é requisito de acessibilidade (SPEC §9) e é o que um
                  leitor de tela lê no lugar da peça. Editável aqui porque o
                  automático — "Rolex Submariner" — descreve a peça, não a foto.
                */}
                <form action={salvarAlt} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <label htmlFor={`alt-${f.id}`} className="meta">
                    Descrição da imagem
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`alt-${f.id}`}
                      name="alt"
                      defaultValue={f.alt}
                      className="campo flex-1"
                      style={{ minWidth: "12rem" }}
                      placeholder="Rolex Submariner ref. 126610LN, mostrador preto, de frente"
                    />
                    <button
                      type="submit"
                      className="label border px-3"
                      style={{
                        minHeight: 44,
                        borderColor: "var(--color-border)",
                      }}
                    >
                      Salvar
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <form action={moverFoto}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="direcao" value="cima" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      aria-label="Mover para cima"
                      className="label border px-3 disabled:opacity-30"
                      style={{
                        minHeight: 44,
                        borderColor: "var(--color-border)",
                      }}
                    >
                      ↑
                    </button>
                  </form>

                  <form action={moverFoto}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="direcao" value="baixo" />
                    <button
                      type="submit"
                      disabled={i === fotos.length - 1}
                      aria-label="Mover para baixo"
                      className="label border px-3 disabled:opacity-30"
                      style={{
                        minHeight: 44,
                        borderColor: "var(--color-border)",
                      }}
                    >
                      ↓
                    </button>
                  </form>

                  <form
                    action={excluirFoto}
                    className="ml-auto"
                    onSubmit={(e) => {
                      if (!confirm("Apagar esta foto? Não dá para desfazer.")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <button
                      type="submit"
                      className="label px-3"
                      style={{ minHeight: 44, color: "var(--estado-erro)" }}
                    >
                      Apagar
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {restam > 0 ? (
        <form
          action={acao}
          className="flex flex-col gap-4 border border-dashed p-5"
          style={{ borderColor: "var(--color-border)" }}
          onSubmit={() => setEscolhidas(0)}
        >
          <input type="hidden" name="slug" value={slug} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="fotos" className="label">
              Adicionar fotos
            </label>
            <input
              ref={entrada}
              id="fotos"
              name="fotos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={(e) => setEscolhidas(e.target.files?.length ?? 0)}
              className="text-sm"
              style={{ color: "var(--color-foreground)" }}
            />
            <span className="meta">
              JPG, PNG, WebP ou AVIF, até 10 MB cada. Cabem mais {restam}.
              {fotos.length === 0 && " A primeira que entrar vira a capa."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Enviar vazio={escolhidas === 0} />
            {escolhidas > 0 && (
              <span className="meta">
                {escolhidas} selecionada{escolhidas === 1 ? "" : "s"}
              </span>
            )}
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
      ) : (
        <p className="meta">
          A peça já tem as {MAX_FOTOS} fotos. Apague uma para abrir espaço.
        </p>
      )}
    </section>
  );
}
