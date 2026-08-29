"use server";

import { revalidatePath } from "next/cache";
import { dbAdmin } from "@/lib/db/admin";
import { clienteAtual } from "@/lib/db/server";

export interface EstadoEncomenda {
  sucesso?: string;
  erro?: string;
}

export async function registrarEncomenda(
  _anterior: EstadoEncomenda,
  formData: FormData,
): Promise<EstadoEncomenda> {
  const cliente = await clienteAtual();
  if (!cliente || cliente.status !== "ativo") {
    return { erro: "Apenas membros autorizados podem encomendar peças." };
  }

  const marca = (formData.get("marca") as string)?.trim();
  const modelo = (formData.get("modelo") as string)?.trim();
  const referencia = (formData.get("referencia") as string)?.trim() || null;
  const ano_desejado = (formData.get("ano_desejado") as string)?.trim() || null;
  const orcamento_maximo = (formData.get("orcamento_maximo") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  if (!marca || !modelo) {
    return { erro: "Por favor, informe a marca e o modelo pretendido." };
  }

  const { error } = await dbAdmin.from("encomendas").insert({
    cliente_id: cliente.id,
    marca,
    modelo,
    referencia,
    ano_desejado,
    orcamento_maximo,
    observacoes,
    status: "em_busca",
  });

  if (error) {
    console.error("Erro ao registrar encomenda:", error);
    return { erro: "Não foi possível registrar a encomenda agora. Tente novamente." };
  }

  revalidatePath("/acervo");
  revalidatePath("/painel/negociacoes");

  return {
    sucesso: `Encomenda do ${marca} ${modelo} registrada na mesa. Avisaremos assim que a peça for localizada.`,
  };
}