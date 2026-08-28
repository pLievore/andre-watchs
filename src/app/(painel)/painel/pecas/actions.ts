"use server";

/**
 * Edição de peças pelo painel.
 *
 * Toda escrita passa pela chave secret (`dbAdmin`): não existe política de
 * `insert`/`update` no RLS, então este é o único caminho — e ele exige admin
 * autenticado, checado aqui além do middleware.
 *
 * A tradução para o tipo `Watch` continua sendo responsabilidade de
 * `lib/db/pecas.ts`. Aqui trabalhamos com as colunas do banco, em português.
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

export type EstadoPeca = { erro?: string; sucesso?: string };

/** Campo vazio vira `null`: no banco, ausência é `null`, nunca string vazia. */
function ouNulo(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

/** Número opcional. Texto não-numérico vira `null` em vez de `NaN`. */
function numeroOuNulo(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
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
  // Separador decimal é o último símbolo, se houver exatamente 2 dígitos depois.
  const decimal = /[.,]\d{2}$/.test(limpo);
  const digitos = limpo.replace(/\D/g, "");
  if (digitos === "") return null;

  const centavos = decimal ? Number(digitos) : Number(digitos) * 100;
  return Number.isFinite(centavos) && centavos >= 0 ? centavos : null;
}

export async function salvarPeca(
  _anterior: EstadoPeca,
  form: FormData,
): Promise<EstadoPeca> {
  const admin = await usuarioAdmin();
  if (!admin) return { erro: "Sessão expirada. Entre novamente." };

  const slug = String(form.get("slug") ?? "").trim();
  if (!slug) return { erro: "Peça não identificada." };

  const marca = String(form.get("marca") ?? "").trim();
  const modelo = String(form.get("modelo") ?? "").trim();
  if (!marca || !modelo) return { erro: "Marca e modelo são obrigatórios." };

  const preco = precoParaCentavos(form.get("preco"));
  if (preco === null) return { erro: "Informe um preço válido." };

  const { error } = await dbAdmin
    .from("pecas")
    .update({
      marca,
      modelo,
      condicao: String(form.get("condicao") ?? "seminovo"),
      integralidade: String(form.get("integralidade") ?? "caixa-e-papeis"),
      referencia: ouNulo(form.get("referencia")),
      calibre: ouNulo(form.get("calibre")),
      diametro_mm: numeroOuNulo(form.get("diametro_mm")),
      material_caixa: ouNulo(form.get("material_caixa")),
      pulseira: ouNulo(form.get("pulseira")),
      mostrador: ouNulo(form.get("mostrador")),
      ano_cartao: numeroOuNulo(form.get("ano_cartao")),
      preco_centavos: preco,
      disponivel: form.get("disponivel") === "on",
      consignada: form.get("consignada") === "on",
      historia: ouNulo(form.get("historia")),
      notas_estado: ouNulo(form.get("notas_estado")),
    })
    .eq("slug", slug);

  if (error) {
    console.error("Falha ao salvar peça", { code: error.code, message: error.message });
    return { erro: "Não foi possível salvar. Tente de novo." };
  }

  // O acervo do cliente e a própria lista do painel precisam refletir na hora.
  revalidatePath("/acervo");
  revalidatePath(`/acervo/${slug}`);
  revalidatePath("/painel/pecas");

  return { sucesso: "Peça salva." };
}

/**
 * Atalho de disponibilidade, direto da lista.
 *
 * É a operação mais frequente do Andre — vendeu uma peça e precisa tirá-la da
 * vitrine agora. Obrigá-lo a abrir o formulário inteiro para um botão seria
 * atrito no uso diário.
 */
export async function alternarDisponibilidade(form: FormData): Promise<void> {
  const admin = await usuarioAdmin();
  if (!admin) return;

  const slug = String(form.get("slug") ?? "").trim();
  if (!slug) return;

  const { data: atual } = await dbAdmin
    .from("pecas")
    .select("disponivel")
    .eq("slug", slug)
    .maybeSingle();
  if (!atual) return;

  await dbAdmin
    .from("pecas")
    .update({ disponivel: !atual.disponivel })
    .eq("slug", slug);

  revalidatePath("/acervo");
  revalidatePath(`/acervo/${slug}`);
  revalidatePath("/painel/pecas");
}
