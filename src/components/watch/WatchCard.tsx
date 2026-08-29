/**
 * SPEC §5.2 — card de peça.
 *
 *  - Imagem 4:5
 *  - Marca em rótulo discreto, modelo em display, referência em mono
 *  - Preço em sans regular — nunca bold (§1.3: luxo é discreto)
 *  - Hover desktop: lift 8px + filete de acento acende + crossfade da foto
 *  - Peça vendida: card dimmed com selo VENDIDO (prova social, não erro)
 *  - Peça em negociação: selo discreto, sem véu — ela continua à venda até
 *    fechar, e apagar o card afastaria o segundo interessado
 *
 * Proibido no card: badge de promoção, frete grátis, countdown.
 */

import Link from "next/link";

import type { MockWatch } from "@/lib/data/watches";
import {
  formatCompleteness,
  formatCondition,
  formatPrice,
  formatReferenceLine,
} from "@/lib/format";
import {
  type Watch,
  isGoldPiece,
  stateLabel,
  watchFullName,
  watchHref,
} from "@/lib/types";

type CardWatch = Watch & { placeholderGradient?: readonly [string, string] };

interface WatchCardProps {
  watch: CardWatch | MockWatch;
}

export function WatchCard({ watch }: WatchCardProps) {
  const fullName = watchFullName(watch);
  const hasPrimaryImage = watch.images.primary.url !== "";
  const hasSecondaryImage = !!watch.images.secondary?.url;
  const gradient = watch.placeholderGradient;
  const sold = watch.state === "vendida";
  const reserved = watch.state === "reservada";

  // Peças two-tone/ouro liberam o acento dourado; o resto usa tinta (§3.1).
  const accent = isGoldPiece(watch)
    ? "var(--color-accent-gold)"
    : "var(--color-accent)";

  return (
    <Link
      href={watchHref(watch)}
      className="group block w-full max-w-[21rem] sm:w-[18rem] md:w-[23rem] shrink-0 transition-transform duration-300 will-change-transform hover:-translate-y-2"
      style={{ transitionTimingFunction: "var(--ease-editorial)" }}
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden border transition-all duration-500 group-hover:shadow-[0_22px_50px_-26px_rgba(23,24,26,0.3)]"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
          transitionTimingFunction: "var(--ease-editorial)",
        }}
      >
        {!hasPrimaryImage && gradient && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(120% 90% at 50% 25%, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
            }}
          />
        )}

        {hasPrimaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={watch.images.primary.url}
            alt={watch.images.primary.alt}
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
              hasSecondaryImage
                ? "group-hover:opacity-0"
                : "group-hover:scale-[1.04]"
            }`}
            style={{ transitionTimingFunction: "var(--ease-editorial)" }}
          />
        )}

        {hasSecondaryImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={watch.images.secondary!.url}
            alt={watch.images.secondary!.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:scale-[1.04] group-hover:opacity-100"
            style={{ transitionTimingFunction: "var(--ease-editorial)" }}
          />
        )}

        {/* Placeholder tipográfico enquanto não há foto do estoque (§14 D8). */}
        {!hasPrimaryImage && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-end p-6">
            <WatchGlyph accent={accent} />
            <span
              className="mt-auto label"
            >
              {watch.brand}
            </span>
            <span
              className="mt-1 text-2xl leading-tight"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--color-foreground)",
              }}
            >
              {watch.model}
            </span>
          </div>
        )}

        {/* Linha de acento que acende no hover — metal reagindo à luz (§3.1). */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            transitionTimingFunction: "var(--ease-editorial)",
          }}
        />

        {/*
          Vendida ganha véu — o card vira registro do que passou pela casa.
          Em negociação NÃO ganha véu: a peça ainda está à venda, e esconder a
          foto afastaria quem entraria na fila. O selo fica no canto, discreto.
        */}
        {sold && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: "rgba(250,248,244,0.78)" }}
          >
            <span
              className="border px-5 py-2 text-sm"
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                color: "var(--color-foreground)",
                borderColor: "var(--color-foreground)",
              }}
            >
              {stateLabel(watch.state)}
            </span>
          </div>
        )}

        {reserved && (
          <span
            className="absolute left-4 top-4 z-10 px-3 py-1.5 text-xs"
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              background: "var(--color-background)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-foreground)",
            }}
          >
            {stateLabel(watch.state)}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        {/* Linha 1: Marca e Preço */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="label text-xs uppercase tracking-wider">
            {watch.brand}
          </span>
          <span
            className="text-sm md:text-base font-mono font-medium whitespace-nowrap"
            style={{
              color: sold ? "var(--color-muted)" : "var(--color-foreground)",
            }}
          >
            {formatPrice(watch.priceCents)}
          </span>
        </div>

        {/* Linha 2: Nome do Modelo (Largura total, sem cortar) */}
        <h3
          className="text-base sm:text-lg md:text-xl leading-snug"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.01em",
            color: "var(--color-foreground)",
          }}
        >
          {watch.model}
        </h3>

        {/* Linha 3: Referência e Integralidade / Estado */}
        <div className="flex items-center justify-between gap-3 text-xs meta flex-wrap pt-0.5">
          <span className="font-mono">
            {formatReferenceLine(watch)}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-right">
            {formatCondition(watch.condition)} · {formatCompleteness(watch.completeness)}
          </span>
        </div>
      </div>

      <span className="sr-only">{fullName}</span>
    </Link>
  );
}

/**
 * Marcador de relógio desenhado em SVG — placeholder honesto enquanto não há
 * foto real. Índices às 12/3/6/9 e ponteiros parados às 10h10 (a pose de
 * catálogo), sem imitar nenhuma marca específica.
 */
function WatchGlyph({ accent }: { accent: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="mx-auto w-[42%] opacity-30"
      fill="none"
    >
      <circle cx="50" cy="50" r="38" stroke={accent} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="32" stroke={accent} strokeWidth="0.4" />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="50"
          y1="15"
          x2="50"
          y2="21"
          stroke={accent}
          strokeWidth="1.4"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="28"
        stroke={accent}
        strokeWidth="1.6"
        transform="rotate(-60 50 50)"
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2="34"
        stroke={accent}
        strokeWidth="1.6"
        transform="rotate(50 50 50)"
      />
      <circle cx="50" cy="50" r="1.6" fill={accent} />
    </svg>
  );
}
