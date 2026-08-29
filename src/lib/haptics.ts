/**
 * Cross-platform Haptic Feedback Engine
 *
 * Suporta:
 * 1. iPhone (iOS Safari & Chrome iOS):
 *    O iOS não suporta a API padrão navigator.vibrate.
 *    Para acionar a Taptic Engine física do iPhone no navegador,
 *    utilizamos a funcionalidade nativa do elemento <input type="checkbox" switch />
 *    acionado via label.click().
 *
 * 2. Android (Chrome, Samsung Internet, Firefox, Edge):
 *    Web Vibration API (navigator.vibrate).
 */

export function dispararVibracao(padrao: number | number[] = 12) {
  if (typeof window === "undefined") return;

  // 1. Taptic Engine do iPhone (iOS Safari / Chrome iOS)
  try {
    let label = document.getElementById("ios-haptic-label") as HTMLLabelElement | null;

    if (!label) {
      const container = document.createElement("div");
      container.setAttribute("id", "ios-haptic-container");
      container.setAttribute(
        "style",
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;"
      );
      container.setAttribute("aria-hidden", "true");
      container.innerHTML = `
        <input type="checkbox" id="ios-haptic-switch" switch />
        <label for="ios-haptic-switch" id="ios-haptic-label"></label>
      `;
      document.body.appendChild(container);
      label = document.getElementById("ios-haptic-label") as HTMLLabelElement | null;
    }

    if (label) {
      label.click();
    }
  } catch {}

  // 2. Dispositivos Android e navegadores com Web Vibration API
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch {}
  }
}
