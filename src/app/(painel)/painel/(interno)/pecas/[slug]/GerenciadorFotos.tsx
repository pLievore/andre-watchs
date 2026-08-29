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

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  excluirFoto,
  moverFoto,
  salvarAlt,
  type EstadoFoto,
} from "../fotos-actions";
import { MAX_FOTOS } from "../fotos-config";
import {
  enviarArquivosDaPeca,
  type ProgressoUpload,
} from "../upload-client";

export interface FotoPainel {
  id: string;
  url: string;
  alt: string;
  ordem: number;
}

function papelDa(indice: number): string {
  return indice === 0
    ? "Capa — é esta que aparece no card"
    : indice === 1
      ? "Segunda — aparece no hover do card"
      : "Galeria";
}

function Enviar({
  pending,
  progresso,
}: {
  pending: boolean;
  progresso: ProgressoUpload | null;
}) {
  const texto =
    progresso?.etapa === "registrando"
      ? "Registrando fotos…"
      : progresso?.etapa === "enviando"
        ? `Enviando ${progresso.concluidas} de ${progresso.total}…`
        : pending
          ? "Preparando fotos…"
          : "Enviar fotos";

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary"
    >
      {texto}
    </button>
  );
}

type MovimentoOtimista = { id: string; direcao: "cima" | "baixo" };

function reordenar(
  fotos: FotoPainel[],
  { id, direcao }: MovimentoOtimista,
): FotoPainel[] {
  const atual = fotos.findIndex((foto) => foto.id === id);
  const destino = direcao === "cima" ? atual - 1 : atual + 1;
  if (atual < 0 || destino < 0 || destino >= fotos.length) return fotos;

  const proximas = [...fotos];
  [proximas[atual], proximas[destino]] = [
    proximas[destino]!,
    proximas[atual]!,
  ];
  return proximas;
}

export function GerenciadorFotos({
  slug,
  fotos,
}: {
  slug: string;
  fotos: FotoPainel[];
}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [fotosOtimistas, moverOtimista] = useOptimistic(fotos, reordenar);
  const [movendo, iniciarMovimento] = useTransition();
  const [estado, setEstado] = useState<EstadoFoto>({});
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<ProgressoUpload | null>(null);
  const [escolhidas, setEscolhidas] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const movimentoEmCurso = useRef(false);
  const restam = MAX_FOTOS - fotosOtimistas.length;

  async function aoEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando) return;

    const arquivos = Array.from(entrada.current?.files ?? []);
    if (arquivos.length === 0) {
      setEstado({ erro: "Escolha ao menos uma foto." });
      return;
    }
    setEstado({});
    setProgresso(null);
    setEnviando(true);

    const resultado = await enviarArquivosDaPeca({
      slug,
      arquivos,
      jaTem: fotos.length,
      onProgresso: setProgresso,
    });

    setEstado(resultado);
    setEnviando(false);
    if (resultado.sucesso) {
      setEscolhidas(0);
      setProgresso(null);
      if (entrada.current) entrada.current.value = "";
      router.refresh();
    }
  }

  function aoMover(id: string, direcao: "cima" | "baixo") {
    // O ref fecha também a janela entre dois toques no mesmo frame, antes de o
    // React redesenhar os botões com `disabled`.
    if (movendo || movimentoEmCurso.current) return;
    movimentoEmCurso.current = true;

    iniciarMovimento(async () => {
      moverOtimista({ id, direcao });
      try {
        const resultado = await moverFoto(id, slug, direcao);
        if (resultado.erro) setEstado({ erro: resultado.erro });
        router.refresh();
      } finally {
        movimentoEmCurso.current = false;
      }
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="label">Fotos</h2>
        <span className="meta">
          {fotosOtimistas.length} de {MAX_FOTOS}
        </span>
      </div>

      {fotosOtimistas.length === 0 && (
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

      {fotosOtimistas.length > 0 && (
        <ul className="flex flex-col gap-4">
          {fotosOtimistas.map((f, i) => (
            <motion.li
              key={f.id}
              layout={!reduceMotion}
              transition={{
                layout: {
                  duration: reduceMotion ? 0 : 0.32,
                  ease: [0.22, 1, 0.36, 1],
                },
              }}
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

                {/* O automático cobre o uso comum; o detalhe fica disponível
                    para quem quiser descrever enquadramento ou mostrador. */}
                <details>
                  <summary
                    className="meta cursor-pointer py-2.5"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Descrição para leitor de tela (opcional)
                  </summary>
                  <p className="meta mb-3 max-w-prose leading-relaxed">
                    Não aparece junto da foto. É lida por tecnologias de
                    acessibilidade e usada se a imagem não carregar.
                  </p>
                  <form action={salvarAlt} className="flex flex-col gap-2">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <label htmlFor={`alt-${f.id}`} className="meta">
                      Texto alternativo
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        id={`alt-${f.id}`}
                        name="alt"
                        defaultValue={f.alt}
                        maxLength={300}
                        className="campo flex-1"
                        style={{ minWidth: "12rem" }}
                        placeholder="Rolex Submariner, mostrador preto, de frente"
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
                </details>

                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <button
                      type="button"
                      onClick={() => aoMover(f.id, "cima")}
                      disabled={i === 0 || movendo}
                      aria-label="Mover para cima"
                      className="label border px-3 disabled:opacity-30"
                      style={{
                        minHeight: 44,
                        borderColor: "var(--color-border)",
                      }}
                    >
                      ↑
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => aoMover(f.id, "baixo")}
                      disabled={i === fotosOtimistas.length - 1 || movendo}
                      aria-label="Mover para baixo"
                      className="label border px-3 disabled:opacity-30"
                      style={{
                        minHeight: 44,
                        borderColor: "var(--color-border)",
                      }}
                    >
                      ↓
                    </button>
                  </div>

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
            </motion.li>
          ))}
        </ul>
      )}

      {restam > 0 ? (
        <form
          onSubmit={aoEnviar}
          className="flex flex-col gap-4 border border-dashed p-5"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex flex-col gap-2">
            <span className="label">Adicionar fotos</span>
            <input
              ref={entrada}
              id="fotos"
              name="fotos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              disabled={enviando}
              onChange={(e) => setEscolhidas(e.target.files?.length ?? 0)}
              className="sr-only"
            />
            <span className="meta">
              JPG, PNG, WebP ou AVIF, até 10 MB cada. Cabem mais {restam}.
              {fotosOtimistas.length === 0 &&
                " A primeira que entrar vira a capa."}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="fotos"
              aria-disabled={enviando}
              className={`btn btn-ghost cursor-pointer ${enviando ? "pointer-events-none opacity-50" : ""}`}
            >
              {escolhidas > 0 ? "Trocar seleção" : "Escolher fotos"}
            </label>
            {escolhidas > 0 && (
              <>
                <Enviar pending={enviando} progresso={progresso} />
                <span className="meta">
                  {escolhidas} selecionada{escolhidas === 1 ? "" : "s"}
                </span>
              </>
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
