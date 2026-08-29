/**
 * Ordem das rotas para navegação por abas com transição deslizante fluida.
 * Permite calcular a direção do movimento lateral (esquerda ou direita)
 * ao alternar entre telas no painel administrativo e na loja/acervo.
 */

export const PAINEL_TABS = [
  "/painel",
  "/painel/dashboard",
  "/painel/negociacoes",
  "/painel/pecas",
  "/painel/conta",
] as const;

export const SITE_TABS = [
  "/acervo",
  "/vender",
  "/sobre",
  "/acervo/conta",
  "/painel",
] as const;

export function getTabDirection(
  routesOrder: readonly string[],
  previousPath: string | null,
  currentPath: string,
): number {
  if (!previousPath || previousPath === currentPath) return 0;

  const getIndex = (path: string): number => {
    if (routesOrder === PAINEL_TABS) {
      if (path === "/painel" || path.startsWith("/painel/clientes")) return 0;
      if (path.startsWith("/painel/dashboard")) return 1;
      if (path.startsWith("/painel/negociacoes")) return 2;
      if (path.startsWith("/painel/pecas")) return 3;
      if (path.startsWith("/painel/conta")) return 4;
    } else {
      if (
        path === "/acervo" ||
        (path.startsWith("/acervo") && !path.startsWith("/acervo/conta"))
      ) {
        return 0;
      }
      if (path.startsWith("/vender")) return 1;
      if (path.startsWith("/sobre")) return 2;
      if (path.startsWith("/acervo/conta")) return 3;
      if (path.startsWith("/painel")) return 4;
    }
    return -1;
  };

  const prevIdx = getIndex(previousPath);
  const currIdx = getIndex(currentPath);

  // Ambas são abas mapeadas: compara o índice para saber se avança ou retrocede
  if (prevIdx !== -1 && currIdx !== -1) {
    if (currIdx > prevIdx) return 1;  // Vai para a direita -> conteúdo entra da direita (+x)
    if (currIdx < prevIdx) return -1; // Vai para a esquerda -> conteúdo entra da esquerda (-x)
    return 0;
  }

  // Navegação hierárquica (ex: lista -> detalhe ou detalhe -> lista)
  if (currentPath.startsWith(previousPath)) return 1;
  if (previousPath.startsWith(currentPath)) return -1;

  return 0;
}
