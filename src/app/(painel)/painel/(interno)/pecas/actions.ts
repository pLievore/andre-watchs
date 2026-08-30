"use server";

/**
 * Gestão de peças pelo painel.
 *
 * Toda escrita passa pela chave secret (`dbAdmin`): não existe política de
 * `insert`/`update` no RLS, então este é o único caminho — e ele exige admin
 * autenticado, checado aqui além do middleware.
 *
 * A tradução para o tipo `Watch` continua sendo responsabilidade de
 * `lib/db/pecas.ts`. Aqui trabalhamos com as colunas do banco, em português.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import type { WatchCompleteness, WatchCondition, WatchState } from "@/lib/types";

export type EstadoPeca = { erro?: string; sucesso?: string; slug?: string };

const ESTADOS: readonly WatchState[] = ["disponivel", "reservada", "vendida"];
const CONDICOES_VALIDAS: readonly WatchCondition[] = ["novo", "seminovo", "pre-owned"];
const INTEGRALIDADES_VALIDAS: readonly WatchCompleteness[] = [
  "full-set",
  "caixa-e-papeis",
  "relogio-e-caixa",
  "somente-relogio",
];

/** Campo vazio vira `null`: no banco, ausência é `null`, nunca string vazia. */
function ouNulo(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Número opcional (aceita vírgula ou ponto como decimal). Texto não-numérico vira `null`. */
function numeroOuNulo(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Ano opcional arredondado para inteiro. */
function anoOuNulo(v: FormDataEntryValue | null): number | null {
  const n = numeroOuNulo(v);
  return n !== null ? Math.round(n) : null;
}

/**
 * "215.000" e "215000,50" viram centavos.
 *
 * O Andre digita como fala. Aceitar só dígitos puros geraria erro silencioso
 * de fator 100 — peça de R$ 215 mil virando R$ 2.150.
 */
function precoParaCentavos(v: FormDataEntryValue | null): number | null {
  const bruto = String(v ?? "").trim();
  if (bruto === "") return null;

  const limpo = bruto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;

  // Se tem separador decimal com 1 dígito no fim (ex: "215000,5"):
  if (/[.,]\d{1}$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, "");
    const centavos = Number(digitos) * 10;
    return Number.isFinite(centavos) && centavos >= 0 ? centavos : null;
  }

  // Se tem separador decimal com 2 dígitos no fim (ex: "215000,50" ou "215.000,00"):
  if (/[.,]\d{2}$/.test(limpo)) {
    const digitos = limpo.replace(/\D/g, "");
    const centavos = Number(digitos);
    return Number.isFinite(centavos) && centavos >= 0 ? centavos : null;
  }

  // Sem decimais (ex: "215000" ou "215.000"):
  const digitos = limpo.replace(/\D/g, "");
  if (digitos === "") return null;
  const centavos = Number(digitos) * 100;
  return Number.isFinite(centavos) && centavos >= 0 ? centavos : null;
}

function estadoValido(v: FormDataEntryValue | null): WatchState {
  const s = String(v ?? "").trim();
  return (ESTADOS as readonly string[]).includes(s)
    ? (s as WatchState)
    : "disponivel";
}

function condicaoValida(v: FormDataEntryValue | null): WatchCondition {
  const s = String(v ?? "").trim();
  return (CONDICOES_VALIDAS as readonly string[]).includes(s)
    ? (s as WatchCondition)
    : "seminovo";
}

function integralidadeValida(v: FormDataEntryValue | null): WatchCompleteness {
  const s = String(v ?? "").trim();
  return (INTEGRALIDADES_VALIDAS as readonly string[]).includes(s)
    ? (s as WatchCompleteness)
    : "caixa-e-papeis";
}

/**
 * `Rolex Submariner Date 126610LN` → `rolex-submariner-date-126610ln`.
 *
 * O slug é a URL da peça e nunca muda depois de criado — link que o Andre
 * mandou no WhatsApp semana passada tem que continuar abrindo. Por isso ele é
 * derivado uma vez, na criação, e o formulário de edição não o toca.
 */
function paraSlug(partes: string[]): string {
  return partes
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Sufixa `-2`, `-3`… até achar um livre. Duas Submariner iguais acontecem. */
async function slugLivre(base: string): Promise<string> {
  const raiz = base || "peca";
  for (let n = 1; n < 50; n++) {
    const tentativa = n === 1 ? raiz : `${raiz}-${n}`;
    const { data } = await dbAdmin
      .from("pecas")
      .select("slug")
      .eq("slug", tentativa)
      .maybeSingle();
    if (!data) return tentativa;
  }
  return `${raiz}-${Date.now()}`;
}

/** Revalida os lugares onde a peça aparece. */
function revalidar(slug: string) {
  revalidatePath("/acervo");
  revalidatePath(`/acervo/${slug}`);
  revalidatePath("/painel/pecas");
  revalidatePath(`/painel/pecas/${slug}`);
  revalidatePath("/painel/negociacoes");
  revalidatePath("/painel/dashboard");
  revalidatePath("/painel");
}

/** Campos comuns a criar e salvar. */
function camposDoForm(form: FormData) {
  return {
    marca: String(form.get("marca") ?? "").trim(),
    modelo: String(form.get("modelo") ?? "").trim(),
    condicao: condicaoValida(form.get("condicao")),
    integralidade: integralidadeValida(form.get("integralidade")),
    referencia: ouNulo(form.get("referencia")),
    calibre: ouNulo(form.get("calibre")),
    diametro_mm: numeroOuNulo(form.get("diametro_mm")),
    material_caixa: ouNulo(form.get("material_caixa")),
    pulseira: ouNulo(form.get("pulseira")),
    mostrador: ouNulo(form.get("mostrador")),
    ano_cartao: anoOuNulo(form.get("ano_cartao")),
    estado: estadoValido(form.get("estado")),
    consignada: form.get("consignada") === "on",
    historia: ouNulo(form.get("historia")),
    notas_estado: ouNulo(form.get("notas_estado")),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Criar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria a peça e devolve o slug para o navegador enviar as fotos direto ao
 * Storage. A navegação só acontece depois desse segundo passo.
 *
 * O formulário de criação pede só o mínimo — marca, modelo, preço, estado —
 * porque o momento de cadastrar é o momento em que a peça chegou na mão e o
 * Andre ainda não conferiu calibre nem ano de cartão. Exigir tudo de uma vez
 * empurraria para o palpite, que é exatamente o que o SPEC §1.3 proíbe.
 *
 * O arquivo nunca entra neste FormData: fotos de celular excedem o limite de
 * corpo da Server Action. Ver `upload-client.ts`.
 */
export async function criarPeca(
  _anterior: EstadoPeca,
  form: FormData,
): Promise<EstadoPeca> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const campos = camposDoForm(form);
  if (!campos.marca || !campos.modelo) {
    return { erro: "Marca e modelo são obrigatórios." };
  }

  const preco = precoParaCentavos(form.get("preco"));
  if (preco === null) return { erro: "Informe um preço válido." };

  const slug = await slugLivre(
    paraSlug([campos.marca, campos.modelo, campos.referencia ?? ""]),
  );

  const { error } = await dbAdmin
    .from("pecas")
    .insert({ ...campos, slug, preco_centavos: preco });

  if (error) {
    console.error("Falha ao criar peça", {
      code: error.code,
      message: error.message,
    });
    return { erro: "Não foi possível criar a peça. Tente de novo." };
  }

  revalidar(slug);
  return { sucesso: "Peça cadastrada.", slug };
}

// ─────────────────────────────────────────────────────────────────────────────
// Editar
// ─────────────────────────────────────────────────────────────────────────────

export async function salvarPeca(
  _anterior: EstadoPeca,
  form: FormData,
): Promise<EstadoPeca> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const slug = String(form.get("slug") ?? "").trim();
  if (!slug) return { erro: "Peça não identificada." };

  const campos = camposDoForm(form);
  if (!campos.marca || !campos.modelo) {
    return { erro: "Marca e modelo são obrigatórios." };
  }

  const preco = precoParaCentavos(form.get("preco"));
  if (preco === null) return { erro: "Informe um preço válido." };

  const { error } = await dbAdmin
    .from("pecas")
    .update({ ...campos, preco_centavos: preco })
    .eq("slug", slug);

  if (error) {
    console.error("Falha ao salvar peça", {
      code: error.code,
      message: error.message,
    });
    return { erro: "Não foi possível salvar. Tente de novo." };
  }

  revalidar(slug);
  return { sucesso: "Peça salva." };
}

/**
 * Troca de estado direto da lista.
 *
 * É a operação mais frequente do Andre — vendeu ou apartou uma peça e precisa
 * refletir isso agora. Obrigá-lo a abrir o formulário inteiro para uma escolha
 * de três opções seria atrito no uso diário.
 */
export async function mudarEstado(
  slugOuForm: string | FormData,
  estadoParam?: string,
): Promise<{ erro?: string; sucesso?: string }> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  let slug = "";
  let estado: WatchState = "disponivel";

  if (typeof slugOuForm === "string") {
    slug = slugOuForm.trim();
    estado = estadoValido(estadoParam ?? null);
  } else {
    slug = String(slugOuForm.get("slug") ?? "").trim();
    estado = estadoValido(slugOuForm.get("estado"));
  }

  if (!slug) return { erro: "Peça não informada." };

  const { error } = await dbAdmin
    .from("pecas")
    .update({ estado })
    .eq("slug", slug);

  if (error) {
    console.error("Erro ao mudar estado", error);
    return { erro: "Não foi possível atualizar o estado." };
  }

  revalidar(slug);
  return { sucesso: "Estado atualizado." };
}

/**
 * Apaga a peça e as fotos dela.
 *
 * Existe para o caso de cadastro errado, não para tirar peça vendida do
 * registro: peça que a casa vendeu é histórico e vale mais listada do que
 * apagada. A confirmação fica na UI.
 */
export async function excluirPeca(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const slug = String(form.get("slug") ?? "").trim();
  if (!slug) return;

  const { data: peca } = await dbAdmin
    .from("pecas")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!peca) return;

  // Os arquivos do Storage não caem no `on delete cascade` do Postgres —
  // aquilo só apaga a linha da tabela `fotos`. Sem isto, o bucket vira
  // depósito de imagem órfã que ninguém mais consegue nem listar.
  const { data: fotos } = await dbAdmin
    .from("fotos")
    .select("url, url_thumb")
    .eq("peca_id", peca.id);

  // Original e miniatura: desde a fase 13 cada foto pode ter dois objetos.
  const caminhos = (fotos ?? [])
    .flatMap((f) => [f.url, f.url_thumb])
    .filter(
      (u): u is string => typeof u === "string" && !/^https?:\/\//i.test(u),
    );
  if (caminhos.length) {
    await dbAdmin.storage.from("pecas").remove(caminhos);
  }

  await dbAdmin.from("pecas").delete().eq("id", peca.id);

  revalidar(slug);
  redirect("/painel/pecas");
}
