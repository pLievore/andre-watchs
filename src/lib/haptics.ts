/**
 * Cross-platform Haptic Feedback Engine
 *
 * 1. iPhone (iOS Safari & Chrome iOS):
 *    - No iOS, a Apple bloqueia a Web Vibration API (navigator.vibrate).
 *    - A Taptic Engine física silenciosa é acionada pelo toque direto do dedo
 *      nos elementos nativos <input type="checkbox" switch /> posicionados nas abas.
 *    - Zero áudio, totalmente silencioso.
 *
 * 2. Android (Chrome, Samsung Internet, Firefox, Edge):
 *    - Web Vibration API (navigator.vibrate) silenciosa.
 */

export function dispararVibracao(padrao: number | number[] = 12) {
  if (typeof window === "undefined") return;

  // Tentativa de acionamento do switch para compatibilidade iOS
  try {
    const staticLabel = document.getElementById("ios-haptic-label") as HTMLLabelElement | null;
    if (staticLabel) {
      staticLabel.click();
    }
  } catch {}

  // Dispositivos Android e navegadores com Web Vibration API nativa
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch {}
  }
}
