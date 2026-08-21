/**
 * ⚠️ CATÁLOGO MOCK — dados de vitrine, não estoque real.
 *
 * Referências, calibres e materiais são corretos para os modelos citados, mas
 * **preços, anos de cartão e disponibilidade são placeholder** até a casa
 * entregar o estoque real (SPEC §14 D8). Nada aqui vai ao ar sem conferência.
 *
 * Fotos: ainda não há imagens do estoque, então cada peça renderiza com o
 * `placeholderGradient` do card. Regra do SPEC §13: nunca usar press kit de
 * maison nem render de IA como se fosse peça da casa.
 *
 * Migra pro Drizzle (SPEC §2.2) mantendo o mesmo tipo `Watch` — componente não muda.
 */

import type { Watch } from "@/lib/types";

export interface MockWatch extends Watch {
  /** Fallback visual enquanto não há foto real (SPEC §14 D8). */
  placeholderGradient?: readonly [string, string];
}

export const MOCK_WATCHES: readonly MockWatch[] = [
  {
    slug: "rolex-submariner-date-126610lv",
    brand: "Rolex",
    model: "Submariner Date",
    condition: "seminovo",
    completeness: "full-set",
    consigned: false,
    specs: {
      reference: "126610LV",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "aco-904l",
      bracelet: "oyster",
      dial: "preto com bezel verde",
      warrantyYear: 2023,
    },
    priceCents: 21500000,
    available: true,
    story:
      "O Starbucks de 41 mm, com o calibre 3235 e a Glidelock do fecho. Peça de dono único, adquirida diretamente e conferida na bancada antes de entrar na vitrine.",
    conditionNotes:
      "Marcas leves de uso nos elos centrais, visíveis apenas sob luz direta. Caixa e bezel sem amassados.",
    images: {
      primary: {
        url: "",
        alt: "Rolex Submariner Date ref. 126610LV, mostrador preto e bezel verde, vista frontal",
      },
    },
    placeholderGradient: ["#12261a", "#0a0f0c"],
  },
  {
    slug: "rolex-gmt-master-ii-126710blnr",
    brand: "Rolex",
    model: "GMT-Master II Batman",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      reference: "126710BLNR",
      caliber: "3285",
      caseDiameterMm: 40,
      caseMaterial: "aco-904l",
      bracelet: "jubilee",
      dial: "preto",
      warrantyYear: 2022,
    },
    priceCents: 19800000,
    available: true,
    story:
      "Bezel Cerachrom azul e preto em pulseira Jubilee. Segundo fuso funcionando, revisado e regulado dentro do padrão de fábrica.",
    conditionNotes: "Sem marcas relevantes. Pulseira com folga mínima nos elos.",
    images: {
      primary: {
        url: "",
        alt: "Rolex GMT-Master II ref. 126710BLNR, bezel azul e preto, pulseira Jubilee",
      },
    },
    placeholderGradient: ["#101a2b", "#08090d"],
  },
  {
    slug: "rolex-submariner-date-126613lb",
    brand: "Rolex",
    model: "Submariner Date Bluesy",
    condition: "pre-owned",
    completeness: "full-set",
    consigned: true,
    specs: {
      reference: "126613LB",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "two-tone",
      bracelet: "oyster",
      dial: "azul royal",
      warrantyYear: 2021,
    },
    priceCents: 24900000,
    available: true,
    story:
      "Rolesor amarelo com mostrador azul royal — o Bluesy que fez a comparação de 40 mm contra 41 mm virar assunto recorrente na casa. Peça em consignação.",
    conditionNotes:
      "Ouro do bezel preservado, sem perda de brilho. Micro-riscos no fecho, coerentes com o uso.",
    images: {
      primary: {
        url: "",
        alt: "Rolex Submariner Date ref. 126613LB two-tone, mostrador azul royal",
      },
    },
    placeholderGradient: ["#1a2440", "#0b0d14"],
  },
  {
    slug: "rolex-datejust-41-126334",
    brand: "Rolex",
    model: "Datejust 41",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      reference: "126334",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "aco",
      bracelet: "oyster",
      dial: "verde-oliva sunburst",
      warrantyYear: 2024,
    },
    priceCents: 15900000,
    available: true,
    story:
      "Bezel canelado em ouro branco e mostrador sunburst. O relógio de todo dia que atravessa qualquer década sem envelhecer.",
    images: {
      primary: {
        url: "",
        alt: "Rolex Datejust 41 ref. 126334, mostrador verde-oliva sunburst, bezel canelado",
      },
    },
    placeholderGradient: ["#1c2118", "#0a0b09"],
  },
  {
    slug: "rolex-daytona-116500ln",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    condition: "pre-owned",
    completeness: "full-set",
    specs: {
      reference: "116500LN",
      caliber: "4130",
      caseDiameterMm: 40,
      caseMaterial: "aco-904l",
      bracelet: "oyster",
      dial: "branco panda",
      warrantyYear: 2019,
    },
    priceCents: 32500000,
    available: false,
    story:
      "Panda de bezel Cerachrom, calibre 4130. Saiu da vitrine em menos de uma semana — fica aqui como registro do que passa pela casa.",
    images: {
      primary: {
        url: "",
        alt: "Rolex Cosmograph Daytona ref. 116500LN, mostrador branco panda, bezel Cerachrom preto",
      },
    },
    placeholderGradient: ["#20232a", "#0c0d10"],
  },
  {
    slug: "cartier-panthere-medium-two-tone",
    brand: "Cartier",
    model: "Panthère Medium",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      caseDiameterMm: 27,
      caseMaterial: "two-tone",
      bracelet: "integrada",
      dial: "prateado com algarismos romanos",
      warrantyYear: 2022,
    },
    priceCents: 6900000,
    available: true,
    story:
      "Aço e ouro amarelo, pulseira integrada com o caimento que fez o Panthère voltar ao topo da lista. Coroa com safira azul intacta.",
    conditionNotes: "Elos sem folga. Vidro sem riscos.",
    images: {
      primary: {
        url: "",
        alt: "Cartier Panthère Medium two-tone, mostrador prateado com algarismos romanos",
      },
    },
    placeholderGradient: ["#2b2418", "#0e0c08"],
  },
  {
    slug: "audemars-piguet-royal-oak-15500st",
    brand: "Audemars Piguet",
    model: "Royal Oak Selfwinding",
    condition: "pre-owned",
    completeness: "full-set",
    consigned: true,
    specs: {
      reference: "15500ST",
      caliber: "4302",
      caseDiameterMm: 41,
      caseMaterial: "aco",
      bracelet: "integrada",
      dial: "azul Grande Tapisserie",
      warrantyYear: 2021,
    },
    priceCents: 38500000,
    available: true,
    story:
      "Grande Tapisserie azul, caixa e pulseira integradas com o acabamento alternado polido e acetinado original de fábrica. Consignação de cliente antigo da casa.",
    conditionNotes:
      "Acabamento de fábrica preservado — nunca polida. Marcas de uso normais no fundo da caixa.",
    images: {
      primary: {
        url: "",
        alt: "Audemars Piguet Royal Oak ref. 15500ST, mostrador azul Grande Tapisserie",
      },
    },
    placeholderGradient: ["#151d2e", "#08090e"],
  },
  {
    slug: "omega-speedmaster-professional-31030",
    brand: "Omega",
    model: "Speedmaster Professional",
    condition: "novo",
    completeness: "full-set",
    specs: {
      reference: "310.30.42.50.01.002",
      caliber: "3861",
      caseDiameterMm: 42,
      caseMaterial: "aco",
      bracelet: "oyster",
      dial: "preto",
      warrantyYear: 2025,
    },
    priceCents: 7400000,
    available: true,
    story:
      "Moonwatch de calibre 3861 com certificação Master Chronometer. Lacrado, com garantia internacional em aberto.",
    images: {
      primary: {
        url: "",
        alt: "Omega Speedmaster Professional Moonwatch ref. 310.30.42.50.01.002, mostrador preto",
      },
    },
    placeholderGradient: ["#191b1e", "#08090a"],
  },
];

/** Vitrine da home — SPEC §5.3: 6 a 8 peças, disponíveis primeiro. */
export const FEATURED_WATCHES: readonly MockWatch[] = [...MOCK_WATCHES]
  .sort((a, b) => Number(b.available) - Number(a.available))
  .slice(0, 8);

export function findWatchBySlug(slug: string): MockWatch | undefined {
  return MOCK_WATCHES.find((w) => w.slug === slug);
}
