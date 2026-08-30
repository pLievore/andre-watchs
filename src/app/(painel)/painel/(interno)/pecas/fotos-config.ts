/** Regras compartilhadas pelo seletor no navegador e pelas ações no servidor. */
export const TIPOS_FOTO = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const TAMANHO_MAX_FOTO = 10 * 1024 * 1024;
export const MAX_FOTOS = 8;

export type MetadadosArquivoFoto = {
  nome: string;
  tipo: string;
  tamanho: number;
};

/**
 * Valida antes de criar a peça e valida de novo no servidor antes de assinar.
 * A checagem do navegador é UX; a do servidor é a barreira de segurança.
 */
export function validarArquivosFoto(
  arquivos: readonly MetadadosArquivoFoto[],
  jaTem: number,
): string | null {
  if (arquivos.length === 0) return "Escolha ao menos uma foto.";

  if (jaTem + arquivos.length > MAX_FOTOS) {
    return `A peça aceita ${MAX_FOTOS} fotos. Já tem ${jaTem} — cabem mais ${Math.max(0, MAX_FOTOS - jaTem)}.`;
  }

  for (const arquivo of arquivos) {
    if (!(TIPOS_FOTO as readonly string[]).includes(arquivo.tipo)) {
      return `“${arquivo.nome}” não é JPG, PNG, WebP nem AVIF.`;
    }
    if (arquivo.tamanho > TAMANHO_MAX_FOTO) {
      return `“${arquivo.nome}” passa de 10 MB.`;
    }
  }

  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
   Miniatura e desfoque (fase 13)

   O card do acervo pede um retângulo de ~340px e recebia a foto original de
   vários megabytes. As duas versões abaixo são geradas no navegador, antes do
   envio, e guardadas junto da foto:

     - `THUMB`: WebP de 1000px de largura. Serve card, lista e miniatura da
       galeria, e ainda tem folga para tela de alta densidade.
     - `BLUR`: 20px, embutido como data URL na própria linha da foto. É o que
       ocupa o lugar enquanto a foto real desce.

   Se o navegador não conseguir gerar (formato exótico, imagem gigante), o
   envio segue sem elas e a tela cai na foto original. Degradar é aceitável;
   travar o cadastro do dono, não.
   ──────────────────────────────────────────────────────────────────────────── */

export const LARGURA_THUMB = 1000;
export const QUALIDADE_THUMB = 0.82;
export const LARGURA_BLUR = 20;
export const QUALIDADE_BLUR = 0.5;
/** Teto de segurança: data URL grande deixa de ser atalho e vira peso. */
export const MAX_BLUR_CHARS = 3000;

/** O caminho da miniatura deriva do da foto: `slug/uuid.jpg` → `slug/uuid.thumb.webp`. */
export function caminhoDaMiniatura(caminho: string): string {
  return `${caminho.replace(/\.[^.]+$/, "")}.thumb.webp`;
}
