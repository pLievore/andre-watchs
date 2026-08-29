/**
 * Helpers de formatação — PT-BR, BRL.
 */

import type {
  BraceletType,
  CaseMaterial,
  Watch,
  WatchCompleteness,
  WatchCondition,
} from "@/lib/types";
import { NO_DATA } from "@/lib/types";

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/**
 * Ticket é alto (SPEC §1.2): centavos em R$ 187.500 são ruído visual.
 * Arredonda pra unidade de real na exibição — o valor exato vai na conversa.
 */
export function formatPrice(cents: number): string {
  return BRL.format(Math.round(cents / 100));
}

const CONDITION_LABELS: Record<WatchCondition, string> = {
  novo: "NOVO",
  seminovo: "SEMINOVO",
  "pre-owned": "PRÉ-OWNED",
};

export function formatCondition(condition: WatchCondition): string {
  return CONDITION_LABELS[condition];
}

const COMPLETENESS_LABELS: Record<WatchCompleteness, string> = {
  "full-set": "FULL SET",
  "caixa-e-papeis": "CAIXA E PAPÉIS",
  "relogio-e-caixa": "RELÓGIO E CAIXA",
  "somente-relogio": "SOMENTE RELÓGIO",
};

export function formatCompleteness(value: WatchCompleteness): string {
  return COMPLETENESS_LABELS[value] ?? value;
}

const MATERIAL_LABELS: Record<CaseMaterial, string> = {
  aco: "Aço inoxidável",
  "aco-904l": "Aço Oystersteel 904L",
  "two-tone": "Two-tone (aço e ouro)",
  "ouro-amarelo": "Ouro amarelo 18k",
  "ouro-branco": "Ouro branco 18k",
  "ouro-rose": "Ouro rosé 18k",
  platina: "Platina 950",
  titanio: "Titânio",
  ceramica: "Cerâmica",
};

export function formatMaterial(value: CaseMaterial | string | undefined): string {
  if (!value) return NO_DATA;
  return (MATERIAL_LABELS as Record<string, string>)[value] ?? value;
}

const BRACELET_LABELS: Record<BraceletType, string> = {
  oyster: "Oyster",
  jubilee: "Jubilee",
  president: "President",
  milanese: "Milanese",
  couro: "Couro",
  borracha: "Borracha",
  integrada: "Pulseira integrada",
};

export function formatBracelet(value: BraceletType | string | undefined): string {
  if (!value) return NO_DATA;
  return (BRACELET_LABELS as Record<string, string>)[value] ?? value;
}

export function formatDiameter(mm: number | undefined): string {
  return mm === undefined ? NO_DATA : `${mm} mm`;
}

/** Linha curta do card: referência quando há, senão o ano do cartão. */
export function formatReferenceLine(watch: Watch): string {
  const { reference, warrantyYear } = watch.specs;
  if (reference) return `REF. ${reference}`;
  if (warrantyYear) return `CARTÃO ${warrantyYear}`;
  return NO_DATA;
}
