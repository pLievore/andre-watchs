/**
 * Gatilho tátil do iPhone — uma ilha escondida com um switch nativo.
 *
 * Safari nunca implementou a API de vibração. O único caminho para a Taptic
 * Engine na web é o controle nativo `<input type="checkbox" switch>`
 * (Safari 17.4+): alterná-lo faz o sistema tocar o tique.
 *
 * **Do iOS 17.4 ao 26.4**, um `label.click()` disparado por código valia como
 * alternância e vibrava. É para isso que este elemento existe: qualquer ponto
 * do app pode pedir retorno tátil sem ter um botão nativo por baixo do dedo —
 * é o que faz o deslize entre abas vibrar.
 *
 * **Do iOS 26.5 em diante** a Apple passou a exigir evento confiável: só toque
 * físico em controle nativo aciona a Taptic Engine. Aqui o elemento fica
 * inerte, sem efeito colateral — um checkbox invisível troca de estado e nada
 * mais acontece. Por isso os botões da barra de navegação continuam com o
 * switch transparente sobreposto: ali o dedo toca (ou arrasta) o controle de
 * verdade, e esse caminho segue funcionando em qualquer versão — inclusive
 * durante o arrasto que troca de aba, medido em iOS 26.6.
 *
 * ⚠️ O clique tem de passar pelo **label**. Clicar o input por código não
 * dispara o tique — é uma excentricidade do WebKit, e já era assim antes do
 * patch.
 */
export function GatilhoTatil() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        bottom: 0,
        right: 0,
        width: 1,
        height: 1,
        opacity: 0.001,
        overflow: "hidden",
        zIndex: -1,
      }}
    >
      <input
        type="checkbox"
        id="gatilho-tatil-switch"
        switch=""
        // Fora da ordem de tabulação: é peça de máquina, não controle de
        // interface. Sem isto, o leitor de tela encontra um switch sem nome
        // dentro de um container `aria-hidden`.
        tabIndex={-1}
        aria-hidden="true"
      />
      <label
        htmlFor="gatilho-tatil-switch"
        id="gatilho-tatil-label"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
