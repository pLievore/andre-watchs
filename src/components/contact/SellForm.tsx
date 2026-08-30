"use client";

/**
 * SPEC §7 — avaliação de peça para vender, trocar ou consignar.
 *
 * A proposta é **registrada primeiro** e a conversa abre depois.
 *
 * Antes o formulário só montava a mensagem e pulava para o WhatsApp: quem não
 * completasse o pulo sumia sem deixar rastro, e com o número da casa ainda não
 * configurado o CTA caía no Instagram — proposta nenhuma chegava. Agora a
 * pessoa deixa nome e contato, a casa recebe a ficha no painel, e o botão da
 * conversa continua ali para quem quiser falar na hora.
 */

import { useActionState, useState } from "react";

import { registrarProposta } from "@/app/(site)/vender/actions";
import { CONTACT_CHANNEL, contactHref } from "@/components/contact/WhatsappCta";

type Intent = "vender" | "trocar" | "consignar";

const INTENTS: readonly { id: Intent; label: string }[] = [
  { id: "vender", label: "Vender" },
  { id: "trocar", label: "Trocar" },
  { id: "consignar", label: "Consignar" },
];

const COMPLETENESS_OPTIONS = [
  "Full set (caixa, cartão, manuais e selo)",
  "Caixa e papéis",
  "Somente relógio",
  "Não sei dizer",
] as const;

const INITIAL = {
  nome: "",
  contato: "",
  brand: "",
  model: "",
  reference: "",
  year: "",
  completeness: COMPLETENESS_OPTIONS[0] as string,
  notes: "",
};

export function SellForm() {
  const [intent, setIntent] = useState<Intent>("vender");
  const [form, setForm] = useState(INITIAL);
  const [estado, enviar, enviando] = useActionState(registrarProposta, {});

  const intentLabel =
    intent === "vender"
      ? "vender"
      : intent === "trocar"
        ? "trocar"
        : "deixar em consignação";

  // A mensagem é montada no formato que a casa já usa pra avaliar uma peça.
  const message = [
    `Olá! Gostaria de ${intentLabel} um relógio.`,
    "",
    `Marca: ${form.brand || "—"}`,
    `Modelo: ${form.model || "—"}`,
    `Referência: ${form.reference || "—"}`,
    `Ano do cartão: ${form.year || "—"}`,
    `Acompanha: ${form.completeness}`,
    form.notes ? `Observações: ${form.notes}` : "",
    "",
    "Posso enviar fotos por aqui.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const canSubmit =
    form.nome.trim() !== "" &&
    form.contato.trim() !== "" &&
    form.brand.trim() !== "";

  const update =
    (field: keyof typeof INITIAL) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form className="flex flex-col gap-8" action={enviar}>
      {/* A intenção e o "o que acompanha" viajam como campo escondido: os
          controles visíveis são botões e select controlados por estado. */}
      <input type="hidden" name="intencao" value={intent} />
      <input type="hidden" name="integralidade" value={form.completeness} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="nome"
          name="nome"
          label="Seu nome"
          placeholder="Como a casa deve chamar você"
          value={form.nome}
          onChange={update("nome")}
          required
        />
        <Field
          id="contato"
          name="contato"
          label="Telefone ou e-mail"
          placeholder="(11) 90000-0000"
          value={form.contato}
          onChange={update("contato")}
          required
        />
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend
          className="label"
        >
          O que você quer fazer
        </legend>
        <div className="flex flex-wrap gap-3">
          {INTENTS.map((option) => {
            const active = intent === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setIntent(option.id)}
                aria-pressed={active}
                className="border px-6 py-3 label transition-colors duration-300"
                style={{
                  borderColor: active
                    ? "var(--color-accent)"
                    : "var(--color-border)",
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-muted)",
                  transitionTimingFunction: "var(--ease-editorial)",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="brand"
          name="marca"
          label="Marca"
          placeholder="Rolex"
          value={form.brand}
          onChange={update("brand")}
          required
        />
        <Field
          id="model"
          name="modelo"
          label="Modelo"
          placeholder="Submariner Date"
          value={form.model}
          onChange={update("model")}
          required
        />
        <Field
          id="reference"
          name="referencia"
          label="Referência (se souber)"
          placeholder="126610LN"
          value={form.reference}
          onChange={update("reference")}
        />
        <Field
          id="year"
          name="ano"
          label="Ano do cartão (se houver)"
          placeholder="2023"
          inputMode="numeric"
          value={form.year}
          onChange={update("year")}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="completeness"
          className="label"
        >
          O que acompanha
        </label>
        <select
          id="completeness"
          value={form.completeness}
          onChange={update("completeness")}
          className="border bg-transparent px-4 py-3 text-sm"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
          }}
        >
          {COMPLETENESS_OPTIONS.map((option) => (
            <option
              key={option}
              value={option}
              style={{ background: "var(--color-surface)" }}
            >
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="notes"
          className="label"
        >
          Observações
        </label>
        <textarea
          id="notes"
          name="observacao"
          rows={4}
          value={form.notes}
          onChange={update("notes")}
          placeholder="Marcas de uso, revisões feitas, há quanto tempo você tem a peça."
          className="border bg-transparent px-4 py-3 text-sm leading-relaxed"
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-foreground)",
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {estado.sucesso ? (
          /*
            Depois de registrada, a conversa deixa de ser o único caminho e
            passa a ser atalho: quem quiser falar agora fala, quem não quiser
            já está na fila da casa de qualquer forma.
          */
          <div
            className="flex flex-col gap-4 border px-5 py-5"
            style={{ borderColor: "var(--color-foreground)" }}
          >
            <p className="label">Proposta recebida</p>
            <p className="text-sm leading-relaxed">{estado.sucesso}</p>
            <button
              type="button"
              onClick={() =>
                window.open(contactHref(message), "_blank", "noopener,noreferrer")
              }
              className="btn btn-ghost justify-center"
            >
              Falar agora no {CONTACT_CHANNEL}
              <span aria-hidden>→</span>
            </button>
          </div>
        ) : (
          <>
            <button
              type="submit"
              disabled={!canSubmit || enviando}
              className="btn btn-primary justify-center"
            >
              {enviando ? "Enviando…" : "Enviar para avaliação"}
              <span aria-hidden>→</span>
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() =>
                window.open(contactHref(message), "_blank", "noopener,noreferrer")
              }
              className="btn btn-ghost justify-center"
            >
              Prefiro falar no {CONTACT_CHANNEL}
            </button>

            {estado.erro && (
              <p
                className="text-sm"
                role="status"
                style={{ color: "var(--color-foreground)" }}
              >
                {estado.erro}
              </p>
            )}

            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              A casa recebe estes dados e responde no contato que você deixar.
              As fotos da peça vão na conversa.
            </p>
          </>
        )}
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  ...inputProps
}: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="label"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="border bg-transparent px-4 py-3 text-sm"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-foreground)",
        }}
        {...inputProps}
      />
    </div>
  );
}
