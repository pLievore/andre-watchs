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
