import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buscarPecaDoCliente } from "@/lib/db/pecas-sessao";
import {
  formatBracelet,
  formatCompleteness,
  formatCondition,
  formatDiameter,
  formatMaterial,
  formatPrice,
} from "@/lib/format";
import { specValue, watchFullName } from "@/lib/types";
import { BotaoImprimir } from "./BotaoImprimir";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const watch = await buscarPecaDoCliente(slug);
  if (!watch) return { title: "Dossiê não encontrado" };

  return {
    title: `Dossiê Técnico · ${watchFullName(watch)}`,
    robots: { index: false, follow: false },
  };
}

export default async function DossiePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const watch = await buscarPecaDoCliente(slug);
  if (!watch) notFound();

  const dataAtual = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  const specs = [
    { label: "Marca", value: watch.brand },
    { label: "Modelo", value: watch.model },
    { label: "Referência", value: specValue(watch.specs.reference) },
    { label: "Ano de Produção", value: specValue(watch.specs.warrantyYear) },
    { label: "Calibre / Movimento", value: specValue(watch.specs.caliber) },
    { label: "Diâmetro da Caixa", value: formatDiameter(watch.specs.caseDiameterMm) },
    { label: "Material da Caixa", value: formatMaterial(watch.specs.caseMaterial) },
    { label: "Mostrador", value: specValue(watch.specs.dial) },
    { label: "Pulseira & Fecho", value: formatBracelet(watch.specs.bracelet) },
    { label: "Integralidade", value: formatCompleteness(watch.completeness) },
    { label: "Estado Geral", value: formatCondition(watch.condition) },
  ];

  const refFormatada = (watch.specs.reference ?? "VNT").replace(/\s+/g, "");

  return (
    <main
      className="min-h-screen p-6 sm:p-12 md:p-16 print:p-0 print:bg-white print:text-black"
      style={{ background: "var(--color-background)" }}
    >
      {/* ── Barra de Ferramentas Superior (Invisível na Impressão) ────────── */}
      <div className="mx-auto max-w-4xl mb-8 flex items-center justify-between gap-4 border-b pb-4 print:hidden" style={{ borderColor: "var(--color-border)" }}>
        <Link
          href={`/acervo/${watch.slug}`}
          className="link-quiet text-xs flex items-center gap-1.5"
        >
          <span aria-hidden>←</span>
          <span>Voltar à peça no acervo</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="meta text-xs">Formato otimizado para exportação em PDF A4</span>
          <BotaoImprimir />
        </div>
      </div>

      {/* ── Documento Editorial do Dossiê ───────────────────────────────── */}
      <article
        className="mx-auto max-w-4xl border p-8 sm:p-12 print:border-none print:p-0 shadow-sm print:shadow-none"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {/* Cabeçalho do Dossiê */}
        <header className="border-b pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6" style={{ borderColor: "var(--color-border)" }}>
          <div>
            <span
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ color: "var(--color-accent)", letterSpacing: "0.2em" }}
            >
              ANDRE WATCHES · SÃO PAULO
            </span>
            <h1
              className="mt-2 text-2xl sm:text-3xl"
              style={{
                fontFamily: "var(--font-display)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
              }}
            >
              Dossiê Técnico & Laudo de Procedência
            </h1>
            <p className="meta mt-1 text-xs">
              Documento expedido em {dataAtual} · Registro #{refFormatada}-{watch.specs.warrantyYear ?? "S_ANO"}
            </p>
          </div>

          <div className="text-right sm:self-end">
            <span className="label text-[10px]">Preço de Referência</span>
            <p className="text-xl font-mono font-medium mt-0.5" style={{ color: "var(--color-foreground)" }}>
              {formatPrice(watch.priceCents)}
            </p>
          </div>
        </header>

        {/* Resumo da Peça com Imagem */}
        <section className="py-8 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start border-b" style={{ borderColor: "var(--color-border)" }}>
          <div
            className="relative aspect-[4/5] w-full overflow-hidden border"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={watch.images.primary.url}
              alt={watchFullName(watch)}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="meta text-xs uppercase tracking-wider">{watch.brand}</span>
              <h2
                className="text-2xl mt-1"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              >
                {watch.model}
              </h2>
              {watch.specs.reference && (
                <p className="meta text-sm font-mono mt-0.5">Ref. {watch.specs.reference}</p>
              )}
            </div>

            {watch.story && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
                {watch.story}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t text-xs" style={{ borderColor: "var(--color-border)" }}>
              <div>
                <span className="meta block">Estado Declarado</span>
                <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  {formatCondition(watch.condition)}
                </span>
              </div>
              <div>
                <span className="meta block">Integralidade</span>
                <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  {formatCompleteness(watch.completeness)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Grade de Especificações Técnicas */}
        <section className="py-8 border-b" style={{ borderColor: "var(--color-border)" }}>
          <h3 className="label text-xs uppercase tracking-wider mb-4" style={{ color: "var(--color-foreground)" }}>
            Ficha Técnica Detalhada
          </h3>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-xs">
            {specs.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between border-b pb-2"
                style={{ borderColor: "var(--color-border)" }}
              >
                <dt className="meta">{s.label}</dt>
                <dd className="font-medium text-right" style={{ color: "var(--color-foreground)" }}>
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Laudo de Originalidade e Estado */}
        {watch.conditionNotes && (
          <section className="py-8 border-b" style={{ borderColor: "var(--color-border)" }}>
            <h3 className="label text-xs uppercase tracking-wider mb-3" style={{ color: "var(--color-foreground)" }}>
              Laudo de Conservação & Inspeção da Bancada
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {watch.conditionNotes}
            </p>
          </section>
        )}

        {/* Rodapé e Autenticação da Casa */}
        <footer className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="max-w-md">
            <p className="text-xs font-serif italic" style={{ color: "var(--color-muted)" }}>
              "Cada peça é autenticada e conferida em bancada antes de qualquer oferta.
              A procedência é a primeira e última palavra da nossa casa."
            </p>
            <p className="meta text-[11px] mt-2">
              Andre Watches · Desde 2012 · São Paulo, SP · Brasil
            </p>
          </div>

          <div className="border p-4 text-center min-w-48" style={{ borderColor: "var(--color-border)" }}>
            <span
              className="text-[10px] uppercase font-mono tracking-widest block"
              style={{ color: "var(--color-accent)" }}
            >
              AUTENTICIDADE CONFERIDA
            </span>
            <span className="text-xs font-semibold block mt-1">ANDRE WATCHES</span>
            <span className="meta text-[10px] block mt-0.5">Procedência Certificada</span>
          </div>
        </footer>
      </article>
    </main>
  );
}