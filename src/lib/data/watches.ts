/**
 * ⚠️ CATÁLOGO DE DEMONSTRAÇÃO — não é o estoque da casa.
 *
 * **As fotos NÃO são das peças da casa.** São imagens do Unsplash (licença de
 * uso comercial), escolhidas para mostrar ao cliente como a vitrine, o card e a
 * PDP se comportam com material real. Preços, anos de cartão e disponibilidade
 * são placeholder.
 *
 * Isso viola de propósito o SPEC §13 ("nunca usar foto que não é da peça") e só
 * pode existir enquanto o site for demonstração. **Antes de qualquer publicação,
 * todas as imagens de `/public/pecas/` precisam ser substituídas pelas fotos do
 * estoque real** (SPEC §14 D8).
 *
 * O que É verdadeiro aqui: marca, modelo, referência, calibre, material e
 * pulseira correspondem ao que cada foto realmente mostra. O catálogo foi
 * montado a partir das imagens, e não o contrário — card com foto de outra peça
 * seria o primeiro erro que um comprador notaria. Onde a foto não permite
 * afirmar a referência com segurança, o campo fica ausente e a UI mostra `—`.
 *
 * Migra pro Drizzle (SPEC §2.2) mantendo o mesmo tipo `Watch`.
 */

import type { Watch } from "@/lib/types";

export interface MockWatch extends Watch {
  /** Lavagem clara de placeholder para peça sem foto (SPEC §14 D8). */
  placeholderGradient?: readonly [string, string];
}

/**
 * As entradas abaixo declaram só `available`; `state` sai daí.
 *
 * Derivar em vez de escrever nas dez entradas evita a única falha que importa
 * neste arquivo de demonstração: uma peça com `available: true` e
 * `state: "vendida"`, que renderizaria um card contradizendo a si mesmo.
 */
type MockWatchBruto = Omit<MockWatch, "state">;

const CATALOGO: readonly MockWatchBruto[] = [
  {
    slug: "rolex-submariner-date-126613lb",
    brand: "Rolex",
    model: "Submariner Date Bluesy",
    condition: "seminovo",
    completeness: "full-set",
    consigned: true,
    specs: {
      reference: "126613LB",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "two-tone",
      bracelet: "oyster",
      dial: "azul royal com bezel Cerachrom azul",
      warrantyYear: 2022,
    },
    priceCents: 24900000,
    available: true,
    story:
      "Rolesor amarelo com mostrador azul royal — o Bluesy que faz a comparação entre 40 e 41 mm virar assunto recorrente na casa. Peça em consignação de cliente antigo.",
    conditionNotes:
      "Ouro do bezel preservado, sem perda de brilho. Micro-riscos no fecho, coerentes com o uso declarado.",
    images: {
      primary: {
        url: "/pecas/sub-bluesy-1.webp",
        alt: "Rolex Submariner Date ref. 126613LB two-tone, mostrador e bezel azuis, vista de perfil",
      },
      secondary: {
        url: "/pecas/sub-bluesy-2.webp",
        alt: "Macro do mostrador de um Rolex Submariner Date, com a impressão SUBMARINER e a lupa Cyclops sobre a data",
      },
      gallery: [
        {
          url: "/pecas/sub-bluesy-2.webp",
          alt: "Macro do mostrador do Rolex Submariner Date ref. 126613LB",
        },
      ],
    },
  },
  {
    slug: "rolex-submariner-date-126613ln",
    brand: "Rolex",
    model: "Submariner Date",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      reference: "126613LN",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "two-tone",
      bracelet: "oyster",
      dial: "preto com bezel Cerachrom preto",
      warrantyYear: 2021,
    },
    priceCents: 22400000,
    available: true,
    story:
      "Rolesor amarelo com mostrador preto — a leitura mais discreta do Submariner two-tone. Coroa Triplock e fecho Glidelock funcionando dentro do padrão.",
    conditionNotes: "Sem amassados na caixa. Elos centrais com brilho de uso.",
    images: {
      primary: {
        url: "/pecas/sub-twotone-1.webp",
        alt: "Rolex Submariner Date ref. 126613LN two-tone, mostrador e bezel pretos, vista frontal",
      },
      secondary: {
        url: "/pecas/sub-twotone-2.webp",
        alt: "Detalhe do bezel Cerachrom e dos índices aplicados de um Rolex Submariner Date",
      },
      gallery: [
        {
          url: "/pecas/sub-twotone-2.webp",
          alt: "Detalhe do bezel e dos índices do Rolex Submariner Date ref. 126613LN",
        },
      ],
    },
  },
  {
    slug: "rolex-submariner-date-126610ln",
    brand: "Rolex",
    model: "Submariner Date",
    condition: "seminovo",
    completeness: "full-set",
    specs: {
      reference: "126610LN",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "aco-904l",
      bracelet: "oyster",
      dial: "preto",
      warrantyYear: 2023,
    },
    priceCents: 19800000,
    available: true,
    story:
      "O Submariner de 41 mm em Oystersteel, calibre 3235 e Glidelock no fecho. Peça de dono único, conferida na bancada antes de entrar na vitrine.",
    conditionNotes:
      "Marcas leves de uso nos elos centrais, visíveis apenas sob luz direta.",
    images: {
      primary: {
        url: "/pecas/sub-aco-1.webp",
        alt: "Rolex Submariner Date ref. 126610LN em aço Oystersteel, mostrador preto, sobre superfície branca",
      },
      secondary: {
        url: "/pecas/sub-aco-2.webp",
        alt: "Rolex Submariner Date ref. 126610LN em luz baixa, mostrando o perfil da caixa e a pulseira Oyster",
      },
      gallery: [
        {
          url: "/pecas/sub-aco-2.webp",
          alt: "Perfil da caixa e pulseira Oyster do Rolex Submariner Date ref. 126610LN",
        },
      ],
    },
  },
  {
    slug: "rolex-datejust-41-126300-azul",
    brand: "Rolex",
    model: "Datejust 41",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      reference: "126300",
      caliber: "3235",
      caseDiameterMm: 41,
      caseMaterial: "aco",
      bracelet: "oyster",
      dial: "azul sunburst",
      warrantyYear: 2024,
    },
    priceCents: 14900000,
    available: true,
    story:
      "Bezel liso e mostrador azul sunburst em pulseira Oyster. O relógio de todo dia que atravessa qualquer década sem envelhecer.",
    images: {
      primary: {
        url: "/pecas/datejust-azul-1.webp",
        alt: "Rolex Datejust 41 ref. 126300 em aço, mostrador azul sunburst e bezel liso, vista frontal",
      },
      secondary: {
        url: "/pecas/datejust-azul-2.webp",
        alt: "Macro dos elos e do acabamento polido da pulseira Oyster do Rolex Datejust 41",
      },
      gallery: [
        {
          url: "/pecas/datejust-azul-2.webp",
          alt: "Macro da pulseira Oyster do Rolex Datejust 41 ref. 126300",
        },
      ],
    },
  },
  {
    slug: "rolex-datejust-36-126233-chocolate",
    brand: "Rolex",
    model: "Datejust 36",
    condition: "seminovo",
    completeness: "full-set",
    specs: {
      reference: "126233",
      caliber: "3235",
      caseDiameterMm: 36,
      caseMaterial: "two-tone",
      bracelet: "jubilee",
      dial: "chocolate com índices de diamante",
      warrantyYear: 2023,
    },
    priceCents: 13600000,
    available: true,
    story:
      "Rolesor amarelo com bezel canelado e mostrador chocolate de índices em diamante, na Jubilee. Os 36 mm que voltaram a ser a medida mais pedida da casa.",
    conditionNotes: "Diamantes completos e firmes. Ouro do bezel sem desgaste.",
    images: {
      primary: {
        url: "/pecas/datejust-choco-1.webp",
        alt: "Rolex Datejust 36 ref. 126233 two-tone, mostrador chocolate com índices de diamante e pulseira Jubilee",
      },
    },
  },
  {
    slug: "rolex-datejust-16233-champanhe",
    brand: "Rolex",
    model: "Datejust 36",
    condition: "pre-owned",
    completeness: "somente-relogio",
    specs: {
      reference: "16233",
      caliber: "3135",
      caseDiameterMm: 36,
      caseMaterial: "two-tone",
      bracelet: "jubilee",
      dial: "champanhe",
    },
    priceCents: 6900000,
    available: true,
    story:
      "O Datejust two-tone de mostrador champanhe, calibre 3135 — a geração que sustentou a reputação de robustez da referência. Sem caixa e sem cartão.",
    conditionNotes:
      "Marcas de uso visíveis nos elos e no fecho. Vidro sem trincas. Ano de fabricação a confirmar pelo número de série.",
    images: {
      primary: {
        url: "/pecas/datejust-choco-2.webp",
        alt: "Rolex Datejust 36 ref. 16233 two-tone, mostrador champanhe, sobre superfície escura",
      },
    },
  },
  {
    slug: "rolex-cosmograph-daytona-116508",
    brand: "Rolex",
    model: "Cosmograph Daytona",
    condition: "pre-owned",
    completeness: "full-set",
    specs: {
      reference: "116508",
      caliber: "4130",
      caseDiameterMm: 40,
      caseMaterial: "ouro-amarelo",
      bracelet: "oyster",
      dial: "preto com contadores dourados",
      warrantyYear: 2020,
    },
    priceCents: 42500000,
    available: false,
    story:
      "Daytona em ouro amarelo 18k, calibre 4130. Saiu da vitrine em menos de uma semana — fica aqui como registro do que passa pela casa.",
    images: {
      primary: {
        url: "/pecas/daytona-1.webp",
        alt: "Rolex Cosmograph Daytona ref. 116508 em ouro amarelo, mostrador preto com contadores dourados",
      },
    },
  },
  {
    slug: "omega-seamaster-planet-ocean-chronograph",
    brand: "Omega",
    model: "Seamaster Planet Ocean Chronograph",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      reference: "215.30.46.51.03.001",
      caliber: "9900",
      caseDiameterMm: 45,
      caseMaterial: "aco",
      bracelet: "oyster",
      dial: "azul com bezel de cerâmica",
      warrantyYear: 2022,
    },
    priceCents: 5400000,
    available: true,
    story:
      "Planet Ocean cronógrafo com calibre coaxial Master Chronometer e válvula de hélio. O mergulhador de uso pesado que aceita terno sem constrangimento.",
    images: {
      primary: {
        url: "/pecas/seamaster-1.webp",
        alt: "Omega Seamaster Planet Ocean Chronograph em aço, mostrador azul e bezel de cerâmica preta",
      },
    },
  },
  {
    slug: "breitling-superocean-automatic-44",
    brand: "Breitling",
    model: "Superocean Automatic 44",
    condition: "seminovo",
    completeness: "caixa-e-papeis",
    specs: {
      // Referência não confirmada pela peça — a UI mostra `—` (SPEC §1.3).
      caseDiameterMm: 44,
      caseMaterial: "aco",
      bracelet: "borracha",
      dial: "preto com bezel bronze",
      warrantyYear: 2021,
    },
    priceCents: 3200000,
    available: true,
    story:
      "Superocean de bezel bronze e mostrador preto, com indicação de dia e data. Cronômetro certificado, feito para uso e não para vitrine.",
    conditionNotes:
      "Referência exata ainda não conferida com o cartão — será confirmada antes do fechamento.",
    images: {
      primary: {
        url: "/pecas/superocean-1.webp",
        alt: "Breitling Superocean Automatic 44, mostrador preto com bezel em bronze e indicação de dia e data",
      },
    },
  },
  {
    slug: "rolex-oyster-perpetual-date-vintage",
    brand: "Rolex",
    model: "Oyster Perpetual Date",
    condition: "pre-owned",
    completeness: "somente-relogio",
    specs: {
      caseDiameterMm: 34,
      caseMaterial: "aco",
      bracelet: "oyster",
      dial: "cinza-tropical",
    },
    priceCents: 4700000,
    available: true,
    story:
      "Oyster Perpetual Date de caixa pequena e mostrador com pátina tropical — o tipo de peça que a casa compra pelo mostrador, não pela referência.",
    conditionNotes:
      "Pátina natural preservada; caixa nunca polida. Referência e ano a confirmar pelo número de série entre as alças.",
    images: {
      primary: {
        url: "/pecas/oyster-vintage-1.webp",
        alt: "Rolex Oyster Perpetual Date vintage em aço, mostrador cinza com pátina, sobre superfície vermelha",
      },
    },
  },
];

export const MOCK_WATCHES: readonly MockWatch[] = CATALOGO.map((w) => ({
  ...w,
  state: w.available ? "disponivel" : "vendida",
}));

/** Vitrine da home — SPEC §5.3: 6 a 8 peças, disponíveis primeiro. */
export const FEATURED_WATCHES: readonly MockWatch[] = [...MOCK_WATCHES]
  .sort((a, b) => Number(b.available) - Number(a.available))
  .slice(0, 8);

export function findWatchBySlug(slug: string): MockWatch | undefined {
  return MOCK_WATCHES.find((w) => w.slug === slug);
}
