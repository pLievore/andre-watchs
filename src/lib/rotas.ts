const ORIGEM_INTERNA = "https://andre-watches.local";

/**
 * Aceita somente destinos dentro do acervo privado.
 *
 * `startsWith("/")` não basta: `//dominio.example` também começa com barra e
 * é interpretado pelo navegador como URL externa. A resolução contra uma
 * origem fictícia elimina esse caso e a whitelist reduz o alcance caso um
 * parâmetro seja adulterado manualmente.
 */
export function destinoSeguroAposLogin(valor?: string): string {
  if (!valor || /[\\\u0000-\u001f]/.test(valor)) return "/acervo";

  try {
    const url = new URL(valor, ORIGEM_INTERNA);
    const dentroDoAcervo =
      url.pathname === "/acervo" || url.pathname.startsWith("/acervo/");

    if (url.origin !== ORIGEM_INTERNA || !dentroDoAcervo) return "/acervo";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/acervo";
  }
}
