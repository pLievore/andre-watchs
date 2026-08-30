"use server";

/**
 * Propostas de venda, troca e consignação.
 *
 * O formulário montava uma mensagem e pulava para o WhatsApp. Quem não
 * completasse o pulo — e é muita gente — sumia sem deixar rastro; com o número
 * ainda não configurado, a proposta ia parar no Instagram. Agora ela é
 * registrada **antes** do pulo, e o pulo continua acontecendo depois.
 *
 * A escrita usa a chave secret de propósito. A alternativa seria abrir uma
 * política de `insert` para anônimo na tabela, o que é o mesmo que deixar um
 * formulário de escrita direta no banco exposto para a internet. Aqui a ação
 * valida, corta o que é grande demais e só então grava.
 */

import { revalidatePath } from "next/cache";

import { dbAdmin } from "@/lib/db/admin";
import { clienteAtual } from "@/lib/db/server";

export interface EstadoProposta {
  sucesso?: string;
  erro?: string;
}

/** Tetos generosos para quem escreve de verdade, apertados para quem despeja. */
const LIMITES = {
  curto: 120,
  medio: 200,
  longo: 2000,
} as const;

function texto(valor: FormDataEntryValue | null, teto: number): string {
  return String(valor ?? "").trim().slice(0, teto);
}

const INTENCOES = ["vender", "trocar", "consignar"] as const;

export async function registrarProposta(
  _anterior: EstadoProposta,
  form: FormData,
): Promise<EstadoProposta> {
  const nome = texto(form.get("nome"), LIMITES.curto);
  const contato = texto(form.get("contato"), LIMITES.curto);
  const marca = texto(form.get("marca"), LIMITES.curto);
  const modelo = texto(form.get("modelo"), LIMITES.curto);
  const intencaoBruta = texto(form.get("intencao"), 20);

  if (!nome || !contato) {
    return { erro: "Diga seu nome e um contato para a casa responder." };
  }
  if (!marca) {
    return { erro: "Informe ao menos a marca da peça." };
  }

  const intencao = (INTENCOES as readonly string[]).includes(intencaoBruta)
    ? intencaoBruta
    : "vender";

  // Se quem preenche já é cliente do clube, a proposta nasce ligada à ficha —
  // o dono vê o histórico inteiro numa tela só.
  const cliente = await clienteAtual();

  const { error } = await dbAdmin.from("propostas").insert({
    cliente_id: cliente?.id ?? null,
    nome,
    contato,
    intencao,
    marca,
    modelo: modelo || null,
    referencia: texto(form.get("referencia"), LIMITES.curto) || null,
    ano: texto(form.get("ano"), 20) || null,
    integralidade: texto(form.get("integralidade"), LIMITES.medio) || null,
    observacao: texto(form.get("observacao"), LIMITES.longo) || null,
    status: "nova",
  });

  if (error) {
    console.error("Falha ao registrar proposta", { message: error.message });
    return {
      erro: "Não foi possível registrar agora. Fale direto com a casa.",
    };
  }

  revalidatePath("/painel/negociacoes");

  return {
    sucesso:
      "Recebido. A casa responde no contato que você deixou — normalmente no mesmo dia.",
  };
}
