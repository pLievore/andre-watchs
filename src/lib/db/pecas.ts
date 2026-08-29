/**
 * Acesso às peças — a fronteira entre o banco e o resto do site.
 *
 * O banco fala português (`marca`, `mostrador`, `preco_centavos`); os
 * componentes falam o tipo `Watch` de `src/lib/types.ts`. **A tradução acontece
 * aqui e só aqui.**
 *
 * Consequência prática: nenhum componente muda de assinatura por causa do
 * banco. Se algum precisar mudar, o mapeamento abaixo é que está errado.
 */

import { db } from "@/lib/db/client";
import type {
  BraceletType,
  CaseMaterial,
  Watch,
  WatchCompleteness,
  WatchCondition,
  WatchState,
} from "@/lib/types";

/** Colunas pedidas em toda consulta. Explícito para não trazer lixo. */
export const CAMPOS = `
  id, slug, marca, modelo, condicao, integralidade,
  referencia, calibre, diametro_mm, material_caixa, pulseira, mostrador, ano_cartao,
  preco_centavos, estado, disponivel, consignada, historia, notas_estado,
  fotos ( url, alt, ordem )
`;

interface LinhaFoto {
  url: string;
  alt: string;
  ordem: number;
}

export interface LinhaPeca {
  id: string;
  slug: string;
  marca: string;
  modelo: string;
  condicao: WatchCondition;
  integralidade: WatchCompleteness;
  referencia: string | null;
  calibre: string | null;
  diametro_mm: number | null;
  material_caixa: string | null;
  pulseira: string | null;
  mostrador: string | null;
  ano_cartao: number | null;
  preco_centavos: number;
  estado: WatchState;
  disponivel: boolean;
  consignada: boolean;
  historia: string | null;
  notas_estado: string | null;
  fotos: LinhaFoto[] | null;
}

/** `null` do banco vira `undefined` — é o que o tipo `Watch` espera. */
function ou<T>(v: T | null): T | undefined {
  return v ?? undefined;
}

export function paraWatch(l: LinhaPeca): Watch {
  const fotos = [...(l.fotos ?? [])].sort((a, b) => a.ordem - b.ordem);
  const [primeira, segunda, ...resto] = fotos;

  return {
    id: l.id,
    slug: l.slug,
    brand: l.marca,
    model: l.modelo,
    condition: l.condicao,
    completeness: l.integralidade,
    specs: {
      reference: ou(l.referencia),
      caliber: ou(l.calibre),
      caseDiameterMm: ou(l.diametro_mm),
      caseMaterial: ou(l.material_caixa) as CaseMaterial | undefined,
      bracelet: ou(l.pulseira) as BraceletType | undefined,
      dial: ou(l.mostrador),
      warrantyYear: ou(l.ano_cartao),
    },
    priceCents: l.preco_centavos,
    state: l.estado,
    available: l.estado === "disponivel",
    consigned: l.consignada,
    story: ou(l.historia),
    conditionNotes: ou(l.notas_estado),
    images: {
      // Peça sem foto ainda renderiza: o card e a galeria já tratam url vazia
      // mostrando a placa de placeholder. Ver WatchGallery.
      primary: primeira ?? { url: "", alt: `${l.marca} ${l.modelo}` },
      ...(segunda ? { secondary: segunda } : {}),
      ...(resto.length ? { gallery: resto } : {}),
    },
  };
}

/** Todas as peças — disponíveis primeiro, como a vitrine espera. */
export async function listarPecas(): Promise<Watch[]> {
  const { data, error } = await db
    .from("pecas")
    .select(CAMPOS)
    .order("estado", { ascending: true })
    .order("criado_em", { ascending: false });

  if (error) throw new Error(`Falha ao listar peças: ${error.message}`);
  return (data as unknown as LinhaPeca[]).map(paraWatch);
}

/** Vitrine da home — SPEC §5.3: 6 a 8 peças. */
export async function listarDestaques(limite = 8): Promise<Watch[]> {
  const { data, error } = await db
    .from("pecas")
    .select(CAMPOS)
    .order("estado", { ascending: true })
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (error) throw new Error(`Falha ao listar destaques: ${error.message}`);
  return (data as unknown as LinhaPeca[]).map(paraWatch);
}

/** Uma peça. `undefined` quando não existe — a PDP chama `notFound()`. */
export async function buscarPecaPorSlug(
  slug: string,
): Promise<Watch | undefined> {
  const { data, error } = await db
    .from("pecas")
    .select(CAMPOS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar peça ${slug}: ${error.message}`);
  return data ? paraWatch(data as unknown as LinhaPeca) : undefined;
}

/** Só os slugs — para `generateStaticParams`, sem carregar o resto. */
export async function listarSlugs(): Promise<string[]> {
  const { data, error } = await db.from("pecas").select("slug");
  if (error) throw new Error(`Falha ao listar slugs: ${error.message}`);
  return (data as { slug: string }[]).map((l) => l.slug);
}
