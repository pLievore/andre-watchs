/**
 * SPEC §5.2 / §6.3 — modelo de domínio do ANDRE WATCHES.
 *
 * Mock-only por enquanto; vai migrar pra Drizzle (SPEC §2.2) sem mudar a forma.
 * Regra do §1.3: dado horológico correto ou ausente. Campos que a casa ainda não
 * confirmou ficam `undefined` e a UI renderiza `—` — nunca um palpite.
 */

/** SPEC §1.3 / §5.2 — condição da peça no mercado secundário. */
export type WatchCondition = "novo" | "seminovo" | "pre-owned";

/** O que acompanha a peça. `full-set` exige caixa + cartão + manuais + selo. */
export type WatchCompleteness = "full-set" | "caixa-e-papeis" | "somente-relogio";

/** Material da caixa. `two-tone` = Rolesor (aço + ouro) — libera o acento dourado. */
export type CaseMaterial =
  | "aco"
  | "aco-904l"
  | "two-tone"
  | "ouro-amarelo"
  | "ouro-branco"
  | "ouro-rose"
  | "platina"
  | "titanio"
  | "ceramica";

export type BraceletType =
  | "oyster"
  | "jubilee"
  | "president"
  | "milanese"
  | "couro"
  | "borracha"
  | "integrada";

export interface WatchImage {
  url: string;
  /** SPEC §9 — alt horológico: marca, modelo, ref., mostrador, ângulo. */
  alt: string;
}

/**
 * Especificação técnica. Todo campo é opcional de propósito: publicar uma peça
 * com referência errada é pior do que publicar sem referência (SPEC §1.3).
 */
export interface WatchSpecs {
  /** Código do modelo — `126610LN`. Vira `sku`/`mpn` no Schema.org (§10). */
  reference?: string;
  /** Movimento — `3235`. */
  caliber?: string;
  /** Diâmetro da caixa em mm. */
  caseDiameterMm?: number;
  caseMaterial?: CaseMaterial;
  bracelet?: BraceletType;
  /** Cor/acabamento do mostrador — "preto", "azul sunburst". */
  dial?: string;
  /** Ano do cartão de garantia, quando houver. */
  warrantyYear?: number;
}

/**
 * Estado comercial da peça.
 *
 * Três estados, não dois: a peça com proposta na mesa não é "vendida" (pode
 * voltar ao acervo) nem "disponível" (não adianta um segundo cliente disputar
 * sem saber que há alguém na frente). Dizer isso ao cliente é honestidade, e
 * honestidade aqui também é escassez real — o oposto de urgência fabricada.
 */
export type WatchState = "disponivel" | "reservada" | "vendida";

export interface Watch {
  id?: string;
  /** SPEC §10 — `rolex-submariner-date-126610ln`. */
  slug: string;
  brand: string;
  model: string;
  condition: WatchCondition;
  completeness: WatchCompleteness;
  specs: WatchSpecs;
  priceCents: number;
  /** Fonte de verdade do estado comercial. */
  state: WatchState;
  /**
   * `estado === "disponivel"`. Derivado, mantido porque metade da UI só quer
   * saber se dá para comprar — e `!w.available` lê melhor que uma comparação
   * de string repetida em todo card.
   */
  available: boolean;
  /** Peça em consignação de terceiro (SPEC §1.2). */
  consigned?: boolean;
  /** Narrativa/procedência — SPEC §6.3. */
  story?: string;
  /** Marcas de uso descritas honestamente (SPEC §1.3). */
  conditionNotes?: string;
  images: {
    primary: WatchImage;
    /** Crossfade no hover desktop (SPEC §5.1). */
    secondary?: WatchImage;
    gallery?: WatchImage[];
  };
}

/** Nome de exibição completo, sem referência. */
export function watchDisplayName(w: Watch): string {
  return `${w.brand} ${w.model}`;
}

/** Nome com referência — usado em `alt`, mensagem de WhatsApp e Schema.org. */
export function watchFullName(w: Watch): string {
  const ref = w.specs.reference;
  return ref ? `${w.brand} ${w.model} ref. ${ref}` : `${w.brand} ${w.model}`;
}

/** PLANO-CLUBE §5 — rota privada da PDP. */
export function watchHref(w: Watch): string {
  return `/acervo/${w.slug}`;
}

/** SPEC §1.3 — sem dado confirmado, a UI mostra travessão, nunca palpite. */
export const NO_DATA = "—";

export function specValue(value: string | number | undefined): string {
  return value === undefined || value === "" ? NO_DATA : String(value);
}

/** Rótulo do estado, do jeito que o cliente lê. */
export function stateLabel(state: WatchState): string {
  return state === "disponivel"
    ? "Disponível"
    : state === "reservada"
      ? "Em negociação"
      : "Vendido";
}

/** Peças two-tone/ouro liberam `--color-accent-gold` (SPEC §3.1). */
export function isGoldPiece(w: Watch): boolean {
  const m = w.specs.caseMaterial;
  return (
    m === "two-tone" ||
    m === "ouro-amarelo" ||
    m === "ouro-rose" ||
    m === "ouro-branco"
  );
}
