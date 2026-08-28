const ORIGEM_INTERNA = "https://andre-watches.local";

/** Áreas internas para onde o login pode mandar alguém de volta. */
const AREAS_INTERNAS = ["/acervo", "/painel"];

/**
 * Aceita somente destinos dentro de uma área interna conhecida.
 *
 * `startsWith("/")` não basta: `//dominio.example` também começa com barra e
 * é interpretado pelo navegador como URL externa. A resolução contra uma
 * origem fictícia elimina esse caso e a whitelist reduz o alcance caso um
 * parâmetro seja adulterado manualmente.
 */
export function destinoSeguroAposLogin(valor?: string, padrao = "/acervo"): string {
  if (!valor || /[\\\u0000-\u001f]/.test(valor)) return padrao;

  try {
    const url = new URL(valor, ORIGEM_INTERNA);
    const dentroDeAreaConhecida = AREAS_INTERNAS.some(
      (area) => url.pathname === area || url.pathname.startsWith(`${area}/`),
    );

    if (url.origin !== ORIGEM_INTERNA || !dentroDeAreaConhecida) return padrao;
    return `${url.pathname}${url.search}`;
  } catch {
    return padrao;
  }
}
