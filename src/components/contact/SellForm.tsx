"use client";

/**
 * SPEC §7 — formulário de avaliação SEM backend.
 *
 * Nesta fase o formulário não envia nada: ele monta uma mensagem estruturada e
 * abre a conversa no canal da casa. Isso mantém a promessa do §7 (conversão é
 * conversa) e evita prometer um "enviamos seu formulário" que ninguém recebe.
 *
 * Quando houver backend (fase E), este componente troca o `contactHref` por uma
 * Server Action e ganha RHF + Zod — a forma dos campos já está pronta pra isso.
 */

import { useState } from "react";

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

  const canSubmit = form.brand.trim() !== "" && form.model.trim() !== "";

  const update =
    (field: keyof typeof INITIAL) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(contactHref(message), "_blank", "noopener,noreferrer");
      }}
    >
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
          label="Marca"
          placeholder="Rolex"
          value={form.brand}
          onChange={update("brand")}
          required
        />
        <Field
          id="model"
          label="Modelo"
          placeholder="Submariner Date"
          value={form.model}
          onChange={update("model")}
          required
        />
        <Field
          id="reference"
          label="Referência (se souber)"
          placeholder="126610LN"
          value={form.reference}
          onChange={update("reference")}
        />
        <Field
          id="year"
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
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn btn-primary justify-center"
        >
          Abrir conversa com a casa
          <span aria-hidden>→</span>
        </button>
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Nada é enviado por este site: o botão abre o {CONTACT_CHANNEL} com
          estes dados já escritos, e as fotos você manda na conversa.
        </p>
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
