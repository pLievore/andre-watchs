"use client";

/**
 * Upload direto para o Storage, compartilhado pelo cadastro e pela edição.
 *
 * Os bytes nunca atravessam a Server Action: ela autoriza e assina o caminho,
 * o navegador envia ao bucket, e outra ação registra as linhas no Postgres.
 * Isso evita o limite de 1 MB do Next e o teto de payload da Vercel.
 */

import { db } from "@/lib/db/client";

import {
  descartarUploads,
  prepararEnvioFotos,
  registrarFotosEnviadas,
  type EstadoFoto,
} from "./fotos-actions";
import {
  validarArquivosFoto,
  type MetadadosArquivoFoto,
} from "./fotos-config";

export type ProgressoUpload = {
  etapa: "preparando" | "enviando" | "registrando";
  concluidas: number;
  total: number;
};

function metadadosDe(arquivos: readonly File[]): MetadadosArquivoFoto[] {
  return arquivos.map((arquivo) => ({
    nome: arquivo.name,
    tipo: arquivo.type,
    tamanho: arquivo.size,
  }));
}

export async function enviarArquivosDaPeca({
  slug,
  arquivos,
  jaTem,
  onProgresso,
}: {
  slug: string;
  arquivos: readonly File[];
  jaTem: number;
  onProgresso?: (progresso: ProgressoUpload) => void;
}): Promise<EstadoFoto> {
  const metadados = metadadosDe(arquivos);
  const erroLocal = validarArquivosFoto(metadados, jaTem);
  if (erroLocal) return { erro: erroLocal };

  onProgresso?.({ etapa: "preparando", concluidas: 0, total: arquivos.length });
  const plano = await prepararEnvioFotos(slug, metadados);
  if (plano.erro || !plano.uploads) {
    return { erro: plano.erro ?? "Não foi possível preparar o envio." };
  }

  const caminhos = plano.uploads.map((upload) => upload.caminho);

  for (let indice = 0; indice < plano.uploads.length; indice++) {
    const upload = plano.uploads[indice];
    const arquivo = arquivos[indice];
    if (!upload || !arquivo) {
      await descartarUploads(slug, caminhos);
      return { erro: "O conjunto de fotos mudou durante o envio. Tente de novo." };
    }

    const { error } = await db.storage
      .from("pecas")
      .uploadToSignedUrl(upload.caminho, upload.token, arquivo, {
        cacheControl: "3600",
        contentType: arquivo.type,
        upsert: false,
      });

    if (error) {
      await descartarUploads(slug, caminhos);
      return { erro: `Não foi possível enviar “${arquivo.name}”. Tente de novo.` };
    }

    onProgresso?.({
      etapa: "enviando",
      concluidas: indice + 1,
      total: arquivos.length,
    });
  }

  onProgresso?.({
    etapa: "registrando",
    concluidas: arquivos.length,
    total: arquivos.length,
  });
  const resultado = await registrarFotosEnviadas(slug, caminhos);

  if (resultado.erro) {
    await descartarUploads(slug, caminhos);
  }

  return resultado;
}
