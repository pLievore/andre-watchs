import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PdpWhatsappCta } from "./PdpWhatsappCta";
import { BotaoGuardar } from "./BotaoGuardar";
import { PecaVisitada } from "./PecaVisitada";
import { WatchViewRecorder } from "./WatchViewRecorder";
import { WatchCard } from "@/components/watch/WatchCard";
import { WatchGallery } from "@/components/watch/WatchGallery";
import { BarraPrevia } from "@/components/layout/BarraPrevia";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import {
  buscarPecaDoCliente,
  listarPecasDoCliente,
} from "@/lib/db/pecas-sessao";
import { pecasGuardadas } from "../guardadas-actions";
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
    // Sem imagem de compartilhamento: a foto da peça não pode viajar com o
    // link para fora do clube (ver (site)/opengraph-image.tsx).
    openGraph: { title: name, type: "website", images: [] },
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

  const admin = await usuarioAdmin();
  const name = watchFullName(watch);
  // Só o cliente guarda peça — o dono não é cliente da própria casa.
  const guardadas = admin ? [] : await pecasGuardadas();
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
      availability:
        watch.state === "disponivel"
          ? "https://schema.org/InStock"
          : watch.state === "reservada"
            ? "https://schema.org/LimitedAvailability"
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

      {/* Avisa a lista que a volta deve cair onde o cliente estava. */}
      <PecaVisitada />

      {admin && <BarraPrevia />}
      {watch.id && !admin && <WatchViewRecorder pecaId={watch.id} />}

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

            {/*
              Três estados, três conversas diferentes. A peça em negociação
              continua com CTA: ela não saiu do acervo, e quem chega depois tem
              o direito de dizer "me avisa se não fechar". Fingir que está livre
              seria desonesto; escondê-la seria perder o segundo comprador.
            */}
            {watch.state !== "vendida" ? (
              <div className="flex flex-col gap-4">
                {watch.state === "reservada" && (
                  <div
                    className="border px-5 py-4"
                    style={{ borderColor: "var(--color-foreground)" }}
                  >
                    <p className="label">Em negociação</p>
                    <p className="mt-2 text-sm leading-relaxed">
                      Há uma conversa em andamento por esta peça. Ela só sai do
                      acervo quando fechar — até lá, dá pra entrar na fila.
                    </p>
                  </div>
                )}
                <PdpWhatsappCta
                  variant="primary"
                  pecaId={watch.id}
                  label={
                    watch.state === "reservada"
                      ? "Avise-me se não fechar"
                      : "Falar sobre esta peça"
                  }
                  context={
                    watch.state === "reservada"
                      ? `Olá! Vi que o ${name} está em negociação. Gostaria de ser avisado se a conversa não fechar.`
                      : `Olá! Tenho interesse na peça: ${name} (${formatCondition(watch.condition)}, ${formatCompleteness(watch.completeness)}) — ${formatPrice(watch.priceCents)}.`
                  }
                />
                <PdpWhatsappCta
                  variant="secondary"
                  pecaId={watch.id}
                  label="Tenho um relógio para trocar"
                  context={`Olá! Tenho interesse em trocar meu relógio por: ${name}.`}
                />

                {/*
                  Guardar fica DEPOIS das duas conversas, não antes: quem já
                  decidiu falar não deve tropeçar num botão de "depois eu vejo".
                  Para quem ainda não decidiu, é a saída que não custa nada.
                */}
                {!admin && watch.id && (
                  <BotaoGuardar
                    pecaId={watch.id}
                    inicial={guardadas.includes(watch.id)}
                  />
                )}
                <Link
                  href={`/acervo/${watch.slug}/dossie`}
                  target="_blank"
                  className="link-quiet text-xs flex items-center justify-center gap-1.5 py-2.5 border transition-colors hover:border-[var(--color-foreground)]"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Dossiê Técnico & Laudo (PDF)</span>
                  <span aria-hidden>↗</span>
                </Link>
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
                  <PdpWhatsappCta
                    variant="secondary"
                    pecaId={watch.id}
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
