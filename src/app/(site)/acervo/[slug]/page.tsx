import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WhatsappCta } from "@/components/contact/WhatsappCta";
import { WatchCard } from "@/components/watch/WatchCard";
import { WatchGallery } from "@/components/watch/WatchGallery";
import {
  buscarPecaDoCliente,
  listarPecasDoCliente,
} from "@/lib/db/pecas-sessao";
import {
  formatBracelet,
  formatCompleteness,
  formatCondition,
  formatDiameter,
  formatMaterial,
  formatPrice,
} from "@/lib/format";
import { specValue, watchFullName } from "@/lib/types";

/*
 * Sem `generateStaticParams`: página privada não pode ser pré-renderizada. Se
 * fosse, o HTML com as peças ficaria em cache e seria servido a qualquer um,
 * passando por cima do RLS. Renderiza sempre no servidor, com a sessão.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const watch = await buscarPecaDoCliente(slug);
  if (!watch) return { title: "Peça não encontrada" };

  const name = watchFullName(watch);
  return {
    title: name,
    description:
      watch.story ??
      `${name} — ${formatCondition(watch.condition)}, ${formatCompleteness(watch.completeness)}. Disponível na Andre Watches.`,
    openGraph: { title: name, type: "website" },
    robots: { index: false, follow: false },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const watch = await buscarPecaDoCliente(slug);
  if (!watch) notFound();

  const name = watchFullName(watch);
  const related = (await listarPecasDoCliente())
    .filter((w) => w.slug !== watch.slug && w.available)
    .slice(0, 3);

  // SPEC §10 — Schema.org Product. `mpn` recebe a referência quando existe.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: watch.story,
    brand: { "@type": "Brand", name: watch.brand },
    ...(watch.specs.reference
      ? { mpn: watch.specs.reference, sku: watch.specs.reference }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (watch.priceCents / 100).toFixed(2),
      itemCondition:
        watch.condition === "novo"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      availability: watch.available
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
    },
  };

  const specs: readonly { label: string; value: string }[] = [
    { label: "Referência", value: specValue(watch.specs.reference) },
    { label: "Calibre", value: specValue(watch.specs.caliber) },
    { label: "Caixa", value: formatDiameter(watch.specs.caseDiameterMm) },
    { label: "Material", value: formatMaterial(watch.specs.caseMaterial) },
    { label: "Mostrador", value: specValue(watch.specs.dial) },
    { label: "Pulseira", value: formatBracelet(watch.specs.bracelet) },
    { label: "Cartão de garantia", value: specValue(watch.specs.warrantyYear) },
    { label: "Acompanha", value: formatCompleteness(watch.completeness) },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <article className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
        <nav aria-label="Você está em" className="mb-10">
          <Link
            href="/acervo"
            className="label underline-offset-8 hover:underline"
          >
            ← Acervo
          </Link>
        </nav>

        {/* SPEC §6.1 — split 60/40, info sticky no desktop. */}
        <div className="grid gap-12 md:grid-cols-[3fr_2fr] md:gap-16">
          <WatchGallery watch={watch} />

          <div className="flex flex-col gap-8 md:sticky md:top-32 md:self-start">
            <header className="flex flex-col gap-3">
              <p className="eyebrow">{watch.brand}</p>
              <h1
                className="text-balance"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2rem, 4vw, 3.25rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {watch.model}
              </h1>
              <p
                className="meta"
              >
                Ref. {specValue(watch.specs.reference)} ·{" "}
                {formatCondition(watch.condition)} ·{" "}
                {formatCompleteness(watch.completeness)}
                {watch.consigned ? " · CONSIGNAÇÃO" : ""}
              </p>
            </header>

            <div className="flex flex-col gap-2">
              <span className="text-2xl md:text-3xl">
                {formatPrice(watch.priceCents)}
              </span>
              <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                Formas de pagamento e parcelamento tratados diretamente com a casa.
              </span>
            </div>

            {watch.available ? (
              <div className="flex flex-col gap-4">
                <WhatsappCta
                  variant="primary"
                  label="Falar sobre esta peça"
                  context={`Olá! Tenho interesse na peça: ${name} (${formatCondition(watch.condition)}, ${formatCompleteness(watch.completeness)}) — ${formatPrice(watch.priceCents)}.`}
                />
                <WhatsappCta
                  variant="secondary"
                  label="Tenho um relógio para trocar"
                  context={`Olá! Tenho interesse em trocar meu relógio por: ${name}.`}
                />
              </div>
            ) : (
              <div
                className="border px-6 py-5"
                style={{ borderColor: "var(--color-border)" }}
              >
                <p
                  className="label"
                >
                  Peça vendida
                </p>
                <p className="mt-3 text-sm leading-relaxed">
                  Esta peça já saiu do acervo. A casa costuma receber modelos
                  semelhantes — dá pra avisar quando entrar um.
                </p>
                <div className="mt-5">
                  <WhatsappCta
                    variant="secondary"
                    label="Quero um parecido"
                    context={`Olá! Vi que o ${name} já foi vendido. Gostaria de ser avisado quando entrar um parecido.`}
                  />
                </div>
              </div>
            )}

            <div
              className="flex flex-col divide-y border-t"
              style={{ borderColor: "var(--color-border)" }}
            >
              {watch.story && (
                <Block title="A peça">
                  <p>{watch.story}</p>
                </Block>
              )}

              <Block title="Estado">
                <p>
                  {watch.conditionNotes ??
                    "Nenhuma marca de uso relevante registrada. Qualquer detalhe é fotografado e informado antes da negociação."}
                </p>
              </Block>

              <Block title="Especificações">
                <dl className="flex flex-col gap-3">
                  {specs.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-baseline justify-between gap-6"
                    >
                      <dt
                        className="meta"
                      >
                        {s.label}
                      </dt>
                      <dd className="text-right text-sm">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </Block>

              <Block title="Como funciona a compra">
                <p>
                  Conferência da peça na sua frente ou por vídeo, pagamento
                  acertado direto com a casa e envio segurado para todo o Brasil.
                  Peças em consignação seguem o mesmo processo.
                </p>
              </Block>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-32" aria-labelledby="related-title">
            <h2
              id="related-title"
              className="mb-10"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Outras peças da casa
            </h2>
            <ul className="flex flex-wrap gap-8">
              {related.map((w) => (
                <li key={w.slug}>
                  <WatchCard watch={w} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}

/** SPEC §6.3 — acordeão expandido por padrão; `<details open>` é a versão acessível. */
function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="group py-6">
      <summary
        className="flex cursor-pointer items-center justify-between label marker:content-none"
      >
        {title}
        <span
          aria-hidden
          className="transition-transform duration-300 group-open:rotate-45"
          style={{ color: "var(--color-accent)" }}
        >
          +
        </span>
      </summary>
      <div
        className="mt-4 text-sm leading-relaxed"
        style={{ color: "var(--color-foreground)" }}
      >
        {children}
      </div>
    </details>
  );
}
