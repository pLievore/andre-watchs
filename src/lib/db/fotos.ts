import "server-only";

/**
 * Assinatura das fotos do acervo.
 *
 * O bucket `pecas` é **privado**. Isso é o que impede o furo mais bobo possível
 * num site fechado: se a foto tivesse URL pública, bastaria alguém copiar o
 * endereço da imagem e o acervo estaria na rua sem ninguém precisar de login.
 *
 * Então toda foto guardada no Storage vira link assinado de vida curta, gerado
 * no servidor a cada render. Fotos antigas — as do Unsplash da demonstração —
 * continuam sendo URL absoluta e passam direto.
 */

import { dbAdmin } from "@/lib/db/admin";
import type { Watch, WatchImage } from "@/lib/types";

/** Uma hora: cobre a visita inteira sem virar link permanente disfarçado. */
const VALIDADE_SEGUNDOS = 3600;

/** URL absoluta é foto externa (Unsplash); o resto é caminho no bucket. */
function ehCaminhoDeBucket(url: string): boolean {
  return url !== "" && !/^https?:\/\//i.test(url);
}

function caminhosDe(w: Watch): string[] {
  const todas = [
    w.images.primary,
    w.images.secondary,
    ...(w.images.gallery ?? []),
  ].filter(Boolean) as WatchImage[];
  return todas.map((f) => f.url).filter(ehCaminhoDeBucket);
}

/**
 * Assina em lote, para a lista inteira de uma vez.
 *
 * Uma chamada por peça faria dezenas de idas ao Storage para montar o acervo.
 * `createSignedUrls` aceita o conjunto todo numa requisição só.
 */
export async function assinarFotos(pecas: Watch[]): Promise<Watch[]> {
  const caminhos = Array.from(new Set(pecas.flatMap(caminhosDe)));
  if (caminhos.length === 0) return pecas;

  const { data, error } = await dbAdmin.storage
    .from("pecas")
    .createSignedUrls(caminhos, VALIDADE_SEGUNDOS);

  if (error) {
    // Falhar aqui não deve derrubar o acervo: a página ainda vale sem a foto,
    // e o card já sabe desenhar o placeholder quando a url vem vazia.
    console.error("Falha ao assinar fotos", error.message);
    return pecas.map(semFotosDeBucket);
  }

  const mapa = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) mapa.set(item.path, item.signedUrl);
  }

  const troca = (f: WatchImage): WatchImage =>
    ehCaminhoDeBucket(f.url) ? { ...f, url: mapa.get(f.url) ?? "" } : f;

  return pecas.map((w) => ({
    ...w,
    images: {
      primary: troca(w.images.primary),
      ...(w.images.secondary ? { secondary: troca(w.images.secondary) } : {}),
      ...(w.images.gallery ? { gallery: w.images.gallery.map(troca) } : {}),
    },
  }));
}

/** Atalho para uma peça só. */
export async function assinarFotosDe(peca: Watch): Promise<Watch> {
  const [assinada] = await assinarFotos([peca]);
  return assinada ?? peca;
}

/** Sem assinatura, a foto do bucket não pode ser exibida — cai no placeholder. */
function semFotosDeBucket(w: Watch): Watch {
  const limpa = (f: WatchImage): WatchImage =>
    ehCaminhoDeBucket(f.url) ? { ...f, url: "" } : f;
  return {
    ...w,
    images: {
      primary: limpa(w.images.primary),
      ...(w.images.secondary ? { secondary: limpa(w.images.secondary) } : {}),
      ...(w.images.gallery ? { gallery: w.images.gallery.map(limpa) } : {}),
    },
  };
}
