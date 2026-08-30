/**
 * Retorno tátil — o que cada plataforma permite.
 *
 * **Android / Chrome / Firefox**: `navigator.vibrate`, que funciona a qualquer
 * momento depois da primeira interação com a página, inclusive durante o
 * deslize entre abas.
 *
 * **iPhone**: Safari não tem API de vibração. O caminho é o switch nativo, e
 * ele mudou de comportamento no meio do caminho:
 *
 * - **iOS 17.4 – 26.4**: `label.click()` por código alterna o switch e vibra.
 *   É o que esta função faz, via `GatilhoTatil` no layout.
 * - **iOS 26.5+**: a Apple passou a exigir evento confiável. Nenhum clique
 *   sintético vibra mais — nem `label.click()`, nem `dispatchEvent` com
 *   `PointerEvent`, porque `isTrusted` não é forjável por script. Sobra o
 *   toque físico em controle nativo, que é como os botões da barra de
 *   navegação vibram (switch transparente sobreposto, ver `ClienteNavMobile`
 *   e `PainelNav`).
 *
 * **O que ainda vibra no iPhone atualizado** (medido em iOS 26.6): tocar *e
 * arrastar* um controle nativo. Por isso a barra inferior é superfície de
 * arrasto — trocar de aba arrastando por ela passa o dedo pelos switches dos
 * botões e o sistema dá o tique sozinho, sem passar por esta função. Deslizar
 * sobre o conteúdo continua mudo: ali não há controle nativo sob o dedo.
 *
 * A chamada é a mesma em toda plataforma — quem chama não precisa saber a
 * versão do sistema, só não deve esperar retorno garantido.
 */

export function dispararVibracao(padrao: number | number[] = 12) {
  if (typeof document !== "undefined") {
    // Precisa ser o label: clicar o input por código nunca disparou o tique.
    document.getElementById("gatilho-tatil-label")?.click();
  }

  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch {
      // Alguns navegadores lançam quando a aba está em segundo plano.
    }
  }
}
