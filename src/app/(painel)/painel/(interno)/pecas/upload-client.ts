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
  type FotoEnviada,
} from "./fotos-actions";
import {
  LARGURA_BLUR,
  LARGURA_THUMB,
  MAX_BLUR_CHARS,
  QUALIDADE_BLUR,
  QUALIDADE_THUMB,
  validarArquivosFoto,
  type MetadadosArquivoFoto,
} from "./fotos-config";

/* ────────────────────────────────────────────────────────────────────────────
   Miniatura e desfoque, feitos no navegador

   Reduzir aqui em vez de no servidor tem duas razões: os bytes já estão na
   máquina de quem enviou (nada trafega duas vezes) e o servidor continua sem
   receber imagem nenhuma, que é o desenho deste fluxo desde o começo.

   Tudo aqui degrada em silêncio: se a redução falhar, o envio segue com a
   foto original e a tela cai nela. Nunca vale travar o cadastro por causa de
   uma miniatura.
   ──────────────────────────────────────────────────────────────────────────── */

type Derivados = { miniatura: Blob | null; desfoque: string | null };

async function carregarImagem(arquivo: File): Promise<HTMLImageElement | null> {
  const endereco = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.decoding = "async";
    imagem.src = endereco;
    await imagem.decode();
    return imagem;
  } catch {
    URL.revokeObjectURL(endereco);
    return null;
  }
}

function desenhar(
  imagem: HTMLImageElement,
  larguraAlvo: number,
): HTMLCanvasElement | null {
  const largura = Math.min(larguraAlvo, imagem.naturalWidth || larguraAlvo);
  const proporcao = imagem.naturalHeight / (imagem.naturalWidth || 1);
  const tela = document.createElement("canvas");
  tela.width = Math.max(1, Math.round(largura));
  tela.height = Math.max(1, Math.round(largura * proporcao));

  const pincel = tela.getContext("2d");
  if (!pincel) return null;

  // O padrão é "low", e reduzir uma foto de 4000px com filtro barato serrilha
  // justamente onde o olho vai: o mostrador.
  pincel.imageSmoothingEnabled = true;
  pincel.imageSmoothingQuality = "high";
  pincel.drawImage(imagem, 0, 0, tela.width, tela.height);
  return tela;
}

function paraBlob(tela: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
  return new Promise((resolver) => {
    tela.toBlob(
      (blob) => {
        // Safari antigo não codifica WebP no canvas — cai em JPEG.
        if (blob) return resolver(blob);
        tela.toBlob((jpeg) => resolver(jpeg), "image/jpeg", qualidade);
      },
      "image/webp",
      qualidade,
    );
  });
}

async function derivadosDe(arquivo: File): Promise<Derivados> {
  const vazio: Derivados = { miniatura: null, desfoque: null };
  if (typeof document === "undefined") return vazio;

  const imagem = await carregarImagem(arquivo);
  if (!imagem) return vazio;

  try {
    const telaThumb = desenhar(imagem, LARGURA_THUMB);
    const telaBlur = desenhar(imagem, LARGURA_BLUR);
    if (!telaThumb || !telaBlur) return vazio;

    const miniatura = await paraBlob(telaThumb, QUALIDADE_THUMB);

    let desfoque: string | null = null;
    try {
      const url = telaBlur.toDataURL("image/webp", QUALIDADE_BLUR);
      // Se o navegador ignorar o formato pedido, ele devolve PNG — que para
      // 20px ainda é pequeno, mas vale conferir o teto de qualquer forma.
      desfoque = url.length <= MAX_BLUR_CHARS ? url : null;
    } catch {
      desfoque = null;
    }

    // Miniatura maior que a foto original não serve para nada.
    if (miniatura && miniatura.size >= arquivo.size) {
      return { miniatura: null, desfoque };
    }

    return { miniatura, desfoque };
  } catch {
    return vazio;
  } finally {
    URL.revokeObjectURL(imagem.src);
  }
}

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

  // Tudo que chegou ao bucket, para poder recolher se algo falhar no meio.
  const enviados: string[] = plano.uploads.map((upload) => upload.caminho);
  const itens: FotoEnviada[] = [];

  for (let indice = 0; indice < plano.uploads.length; indice++) {
    const upload = plano.uploads[indice];
    const arquivo = arquivos[indice];
    if (!upload || !arquivo) {
      await descartarUploads(slug, enviados);
      return { erro: "O conjunto de fotos mudou durante o envio. Tente de novo." };
    }

    const { miniatura, desfoque } = await derivadosDe(arquivo);

    const { error } = await db.storage
      .from("pecas")
      .uploadToSignedUrl(upload.caminho, upload.token, arquivo, {
        cacheControl: "3600",
        contentType: arquivo.type,
        upsert: false,
      });

    if (error) {
      await descartarUploads(slug, enviados);
      return { erro: `Não foi possível enviar “${arquivo.name}”. Tente de novo.` };
    }

    // A miniatura é conveniência, não requisito: se ela falhar, a peça entra
    // com a foto original e ninguém fica sem cadastrar por causa disso.
    let caminhoThumb: string | undefined;
    if (miniatura && upload.miniatura) {
      const { error: erroThumb } = await db.storage
        .from("pecas")
        .uploadToSignedUrl(
          upload.miniatura.caminho,
          upload.miniatura.token,
          miniatura,
          { cacheControl: "3600", contentType: miniatura.type, upsert: false },
        );

      if (!erroThumb) {
        caminhoThumb = upload.miniatura.caminho;
        enviados.push(upload.miniatura.caminho);
      }
    }

    itens.push({
      caminho: upload.caminho,
      ...(caminhoThumb ? { caminhoThumb } : {}),
      ...(desfoque ? { blur: desfoque } : {}),
    });

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
  const resultado = await registrarFotosEnviadas(slug, itens);

  if (resultado.erro) {
    await descartarUploads(slug, enviados);
  }

  return resultado;
}
