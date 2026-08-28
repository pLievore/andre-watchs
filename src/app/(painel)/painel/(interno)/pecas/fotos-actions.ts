"use server";

/**
 * Fotos das peças — envio, ordem, legenda e exclusão.
 *
 * Arquivo separado de `actions.ts` porque a mecânica é outra: aqui se lida com
 * Storage e com a consistência entre dois lugares (o bucket e a tabela
 * `fotos`), que podem divergir se um dos dois falhar. Os bytes seguem direto
 * do navegador ao bucket por URL assinada; as ações só autorizam e registram.
 *
 * **A ordem é o contrato com a vitrine.** `ordem = 0` é a capa do card; `1` é a
 * foto do crossfade no hover; o resto é galeria. Quem reordena aqui está
 * escolhendo a capa — por isso a UI diz isso com todas as letras em vez de
 * mostrar só setas.
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import {
  MAX_FOTOS,
  validarArquivosFoto,
  type MetadadosArquivoFoto,
} from "./fotos-config";

export type EstadoFoto = { erro?: string; sucesso?: string };

function extensaoDe(tipo: string): string {
  return tipo === "image/png"
    ? "png"
    : tipo === "image/webp"
      ? "webp"
      : tipo === "image/avif"
        ? "avif"
        : "jpg";
}

async function pecaPorSlug(slug: string) {
  const { data } = await dbAdmin
    .from("pecas")
    .select("id, slug, marca, modelo, referencia")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

function revalidar(slug: string) {
  revalidatePath("/acervo");
  revalidatePath(`/acervo/${slug}`);
  revalidatePath("/painel/pecas");
  revalidatePath(`/painel/pecas/${slug}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Autorizar, enviar direto ao Storage e registrar
// ─────────────────────────────────────────────────────────────────────────────

export type UploadAssinado = {
  caminho: string;
  token: string;
};

export type PreparacaoUpload = {
  erro?: string;
  uploads?: UploadAssinado[];
};

/**
 * Cria URLs assinadas sem receber os bytes da foto.
 *
 * A autenticação de admin aqui é indispensável: a URL dá poder de escrita no
 * bucket privado durante duas horas, mesmo para quem não tem sessão Supabase.
 */
export async function prepararEnvioFotos(
  slug: string,
  arquivos: MetadadosArquivoFoto[],
): Promise<PreparacaoUpload> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const peca = await pecaPorSlug(slug);
  if (!peca) return { erro: "Peça não encontrada." };

  const { count } = await dbAdmin
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("peca_id", peca.id);

  const jaTem = count ?? 0;
  const erroValidacao = validarArquivosFoto(arquivos, jaTem);
  if (erroValidacao) return { erro: erroValidacao };

  // Se uma aba foi fechada depois do PUT e antes do registro, a próxima
  // tentativa recolhe o objeto. Duas horas protegem uploads ainda em curso.
  await limparOrfaosAntigos(peca.slug, peca.id);

  const uploads: UploadAssinado[] = [];

  for (const arquivo of arquivos) {
    // Nome aleatório, nunca o do arquivo original: nome de origem carrega
    // acento, espaço e às vezes o nome do cliente que mandou a foto.
    const caminho = `${peca.slug}/${crypto.randomUUID()}.${extensaoDe(arquivo.tipo)}`;
    const { data, error } = await dbAdmin.storage
      .from("pecas")
      .createSignedUploadUrl(caminho, { upsert: false });

    if (error || !data) {
      console.error("Falha ao assinar upload", error?.message);
      return { erro: "Não foi possível preparar o envio. Tente de novo." };
    }
    uploads.push({
      caminho,
      token: data.token,
    });
  }

  return { uploads };
}

/**
 * Depois dos PUTs, confirma que os objetos existem e grava todas as linhas em
 * um único INSERT. Se o banco recusar, remove os objetos antes de responder.
 */
export async function registrarFotosEnviadas(
  slug: string,
  caminhos: string[],
): Promise<EstadoFoto> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const peca = await pecaPorSlug(slug);
  if (!peca) return { erro: "Peça não encontrada." };

  const unicos = Array.from(new Set(caminhos));
  if (
    unicos.length === 0 ||
    unicos.length !== caminhos.length ||
    unicos.length > MAX_FOTOS ||
    unicos.some(
      (caminho) =>
        !caminho.startsWith(`${peca.slug}/`) ||
        caminho.includes("..") ||
        !/\.(?:jpe?g|png|webp|avif)$/i.test(caminho),
    )
  ) {
    return { erro: "O conjunto de fotos é inválido. Selecione novamente." };
  }

  const verificacoes = await Promise.all(
    unicos.map((caminho) => dbAdmin.storage.from("pecas").info(caminho)),
  );
  if (verificacoes.some(({ error }) => error)) {
    await limpar(unicos);
    return { erro: "Uma das fotos não chegou inteira. Tente de novo." };
  }

  const [{ data: existentes }, { count }] = await Promise.all([
    dbAdmin
      .from("fotos")
      .select("ordem")
      .eq("peca_id", peca.id)
      .order("ordem", { ascending: false })
      .limit(1),
    dbAdmin
      .from("fotos")
      .select("id", { count: "exact", head: true })
      .eq("peca_id", peca.id),
  ]);

  const jaTem = count ?? 0;
  if (jaTem + unicos.length > MAX_FOTOS) {
    await limpar(unicos);
    return { erro: "A peça atingiu o limite de fotos durante o envio." };
  }

  const proximaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;
  const total = jaTem + unicos.length;
  const linhas = unicos.map((caminho, indice) => ({
    peca_id: peca.id,
    url: caminho,
    alt: altAutomatico(peca, proximaOrdem + indice + 1, total),
    ordem: proximaOrdem + indice,
  }));

  const { error } = await dbAdmin.from("fotos").insert(linhas);

  if (error) {
    console.error("Falha ao registrar fotos", error.message);
    await limpar(unicos);
    return { erro: "Não foi possível registrar as fotos. Tente de novo." };
  }

  revalidar(slug);
  const n = unicos.length;
  return { sucesso: n === 1 ? "Foto enviada." : `${n} fotos enviadas.` };
}

/** Limpeza chamada pelo navegador quando um PUT ou o registro falha. */
export async function descartarUploads(
  slug: string,
  caminhos: string[],
): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const validos = caminhos.filter(
    (caminho) =>
      caminho.startsWith(`${slug}/`) &&
      !caminho.includes("..") &&
      /\.(?:jpe?g|png|webp|avif)$/i.test(caminho),
  );
  await limpar(validos);
}

/** Desfaz uploads parciais para não deixar arquivo órfão no bucket. */
async function limpar(caminhos: string[]) {
  if (caminhos.length === 0) return;
  await dbAdmin.storage.from("pecas").remove(caminhos);
  await dbAdmin.from("fotos").delete().in("url", caminhos);
}

function altAutomatico(
  peca: { marca: string; modelo: string; referencia: string | null },
  posicao: number,
  total: number,
): string {
  const referencia = peca.referencia ? ` ref. ${peca.referencia}` : "";
  return `${peca.marca} ${peca.modelo}${referencia} — foto ${posicao} de ${total}`;
}

/** Recolhe upload abandonado por aba fechada, sem tocar em envio ainda válido. */
async function limparOrfaosAntigos(slug: string, pecaId: string) {
  const [{ data: objetos }, { data: linhas }] = await Promise.all([
    dbAdmin.storage.from("pecas").list(slug, { limit: 100 }),
    dbAdmin.from("fotos").select("url").eq("peca_id", pecaId),
  ]);

  const registrados = new Set((linhas ?? []).map((linha) => linha.url));
  const limite = Date.now() - 2 * 60 * 60 * 1000;
  const orfaos = (objetos ?? [])
    .filter((objeto) => {
      const caminho = `${slug}/${objeto.name}`;
      const criadoEm = Date.parse(objeto.created_at ?? "");
      return (
        objeto.id &&
        !registrados.has(caminho) &&
        Number.isFinite(criadoEm) &&
        criadoEm < limite
      );
    })
    .map((objeto) => `${slug}/${objeto.name}`);

  if (orfaos.length > 0) {
    await dbAdmin.storage.from("pecas").remove(orfaos);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordem, legenda, exclusão
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sobe ou desce uma foto trocando de lugar com a vizinha.
 *
 * Troca de pares em vez de arrastar: o painel é usado no celular, com uma mão,
 * e drag-and-drop em tela sensível ao toque erra mais do que acerta.
 */
export async function moverFoto(
  id: string,
  slug: string,
  direcao: "cima" | "baixo",
): Promise<EstadoFoto> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  if (!id || !slug || !["cima", "baixo"].includes(direcao)) {
    return { erro: "Movimento inválido." };
  }

  const peca = await pecaPorSlug(slug);
  if (!peca) return { erro: "Peça não encontrada." };

  const { data: foto } = await dbAdmin
    .from("fotos")
    .select("peca_id")
    .eq("id", id)
    .maybeSingle();
  if (!foto || foto.peca_id !== peca.id) {
    return { erro: "Foto não encontrada nesta peça." };
  }

  /*
   * Uma função SQL faz a troca numa transação e trava a peça. Além de não
   * deixar uma foto presa em `ordem = -1` se o segundo UPDATE falhar, isso
   * serializa dois cliques concorrentes sobre a mesma galeria.
   */
  const { error } = await dbAdmin.rpc("mover_foto", {
    p_foto_id: id,
    p_direcao: direcao,
  });

  if (error) {
    console.error("Falha ao mover foto", {
      code: error.code,
      message: error.message,
    });
    return { erro: "Não foi possível reordenar. Tente de novo." };
  }

  revalidar(slug);
  return { sucesso: "Ordem atualizada." };
}

/**
 * O texto alternativo — SPEC §9 pede alt horológico, não "foto de relógio".
 */
export async function salvarAlt(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = String(form.get("id") ?? "");
  const slug = String(form.get("slug") ?? "");
  const alt = String(form.get("alt") ?? "").trim();
  if (!id || !slug || !alt || alt.length > 300) return;

  await dbAdmin.from("fotos").update({ alt }).eq("id", id);
  revalidar(slug);
}

/** Apaga a linha e o arquivo, e fecha o buraco que sobra na ordem. */
export async function excluirFoto(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = String(form.get("id") ?? "");
  const slug = String(form.get("slug") ?? "");
  if (!id || !slug) return;

  const peca = await pecaPorSlug(slug);
  if (!peca) return;

  const { data: foto } = await dbAdmin
    .from("fotos")
    .select("url")
    .eq("id", id)
    .maybeSingle();
  if (!foto) return;

  await dbAdmin.from("fotos").delete().eq("id", id);

  if (foto.url && !/^https?:\/\//i.test(foto.url)) {
    await dbAdmin.storage.from("pecas").remove([foto.url]);
  }

  // Sem renumerar, apagar a capa deixaria a peça começando na ordem 1 — o que
  // funciona, mas faz a próxima foto enviada colidir com uma ordem já usada.
  const { data: restantes } = await dbAdmin
    .from("fotos")
    .select("id")
    .eq("peca_id", peca.id)
    .order("ordem", { ascending: true });

  let ordem = 0;
  for (const f of restantes ?? []) {
    await dbAdmin.from("fotos").update({ ordem: ordem++ }).eq("id", f.id);
  }

  revalidar(slug);
}
