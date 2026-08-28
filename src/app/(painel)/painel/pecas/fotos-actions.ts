"use server";

/**
 * Fotos das peças — envio, ordem, legenda e exclusão.
 *
 * Arquivo separado de `actions.ts` porque a mecânica é outra: aqui se lida com
 * bytes, com o Storage e com a consistência entre dois lugares (o bucket e a
 * tabela `fotos`), que podem divergir se um dos dois falhar.
 *
 * **A ordem é o contrato com a vitrine.** `ordem = 0` é a capa do card; `1` é a
 * foto do crossfade no hover; o resto é galeria. Quem reordena aqui está
 * escolhendo a capa — por isso a UI diz isso com todas as letras em vez de
 * mostrar só setas.
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

export type EstadoFoto = { erro?: string; sucesso?: string };

/** O bucket já recusa o resto, mas errar cedo dá mensagem melhor que erro 400. */
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const TAMANHO_MAX = 10 * 1024 * 1024;
/** Oito fotos já contam a peça inteira; além disso a PDP vira rolagem infinita. */
const MAX_FOTOS = 8;

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
    .select("id, slug, marca, modelo")
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
// Enviar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recebe uma ou mais fotos e as anexa ao fim da ordem.
 *
 * Aceita várias de uma vez porque o Andre fotografa a peça inteira numa sessão
 * só — obrigá-lo a repetir o fluxo oito vezes seria o tipo de atrito que faz
 * alguém deixar de cadastrar direito.
 */
export async function enviarFotos(
  _anterior: EstadoFoto,
  form: FormData,
): Promise<EstadoFoto> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const slug = String(form.get("slug") ?? "").trim();
  const peca = await pecaPorSlug(slug);
  if (!peca) return { erro: "Peça não encontrada." };

  const arquivos = form
    .getAll("fotos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (arquivos.length === 0) return { erro: "Escolha ao menos uma foto." };

  const { data: existentes } = await dbAdmin
    .from("fotos")
    .select("ordem")
    .eq("peca_id", peca.id)
    .order("ordem", { ascending: false })
    .limit(1);

  const { count } = await dbAdmin
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .eq("peca_id", peca.id);

  const jaTem = count ?? 0;
  if (jaTem + arquivos.length > MAX_FOTOS) {
    return {
      erro: `A peça aceita ${MAX_FOTOS} fotos. Já tem ${jaTem} — cabem mais ${MAX_FOTOS - jaTem}.`,
    };
  }

  let proximaOrdem = (existentes?.[0]?.ordem ?? -1) + 1;
  const enviados: string[] = [];

  for (const arquivo of arquivos) {
    if (!TIPOS.includes(arquivo.type)) {
      await limpar(enviados);
      return { erro: `"${arquivo.name}" não é JPG, PNG, WebP nem AVIF.` };
    }
    if (arquivo.size > TAMANHO_MAX) {
      await limpar(enviados);
      return { erro: `"${arquivo.name}" passa de 10 MB.` };
    }

    // Nome aleatório, nunca o do arquivo original: nome de origem carrega
    // acento, espaço e às vezes o nome do cliente que mandou a foto.
    const caminho = `${peca.slug}/${crypto.randomUUID()}.${extensaoDe(arquivo.type)}`;

    const { error: erroUpload } = await dbAdmin.storage
      .from("pecas")
      .upload(caminho, arquivo, {
        contentType: arquivo.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (erroUpload) {
      console.error("Falha no upload", erroUpload.message);
      await limpar(enviados);
      return { erro: "Não foi possível enviar. Tente de novo." };
    }
    enviados.push(caminho);

    const { error: erroLinha } = await dbAdmin.from("fotos").insert({
      peca_id: peca.id,
      url: caminho,
      // Alt provisório, honesto e útil no leitor de tela; a UI deixa editar.
      alt: `${peca.marca} ${peca.modelo}`,
      ordem: proximaOrdem++,
    });

    if (erroLinha) {
      console.error("Falha ao registrar foto", erroLinha.message);
      // O arquivo subiu mas a linha não entrou: sem isto o bucket ficaria com
      // uma imagem que nenhuma tela consegue mais alcançar nem apagar.
      await limpar(enviados);
      return { erro: "Não foi possível registrar a foto. Tente de novo." };
    }
  }

  revalidar(slug);
  const n = arquivos.length;
  return { sucesso: n === 1 ? "Foto enviada." : `${n} fotos enviadas.` };
}

/** Desfaz uploads parciais para não deixar arquivo órfão no bucket. */
async function limpar(caminhos: string[]) {
  if (caminhos.length === 0) return;
  await dbAdmin.storage.from("pecas").remove(caminhos);
  await dbAdmin.from("fotos").delete().in("url", caminhos);
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
export async function moverFoto(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const id = String(form.get("id") ?? "");
  const slug = String(form.get("slug") ?? "");
  const direcao = String(form.get("direcao") ?? "");
  if (!id || !slug) return;

  const peca = await pecaPorSlug(slug);
  if (!peca) return;

  const { data: fotos } = await dbAdmin
    .from("fotos")
    .select("id, ordem")
    .eq("peca_id", peca.id)
    .order("ordem", { ascending: true });

  if (!fotos) return;
  const i = fotos.findIndex((f) => f.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;

  const atual = fotos[i];
  const vizinha = fotos[j];
  if (!atual || !vizinha) return;

  // A constraint de ordem é única por peça, então as duas linhas não podem
  // ocupar o mesmo número nem por um instante. O desvio por -1 abre a vaga
  // antes da troca — o supabase-js não expõe transação para adiar a checagem.
  await dbAdmin.from("fotos").update({ ordem: -1 }).eq("id", atual.id);
  await dbAdmin
    .from("fotos")
    .update({ ordem: atual.ordem })
    .eq("id", vizinha.id);
  await dbAdmin
    .from("fotos")
    .update({ ordem: vizinha.ordem })
    .eq("id", atual.id);

  revalidar(slug);
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
  if (!id || !slug || !alt) return;

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
