/**
 * Cross-platform Haptic Feedback Engine
 *
 * Suporta:
 * 1. iPhone (iOS Safari & Chrome iOS):
 *    - Taptic Engine física via elemento nativo <input type="checkbox" switch />
 *    - Pulso acústico háptico via Web Audio API (ressonância do chassi)
 * 2. Android (Chrome, Samsung Internet, Firefox, Edge):
 *    - Web Vibration API (navigator.vibrate)
 */

let audioCtx: AudioContext | null = null;

function tocarPulsoHapticoAudio() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, audioCtx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch {}
}

export function dispararVibracao(padrao: number | number[] = 12) {
  if (typeof window === "undefined") return;

  // 1. Taptic Engine do iPhone (iOS Safari / Chrome iOS via switch hack)
  try {
    const staticLabel = document.getElementById("ios-haptic-label") as HTMLLabelElement | null;
    if (staticLabel) {
      staticLabel.click();
    }

    // Criação dinâmica garantindo novo ciclo no WebKit
    const tempDiv = document.createElement("div");
    tempDiv.setAttribute(
      "style",
      "position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0.001;pointer-events:auto;overflow:hidden;z-index:-1;"
    );
    const rndId = "aw-haptic-" + Math.random().toString(36).slice(2, 7);
    tempDiv.innerHTML = `<input type="checkbox" id="${rndId}" switch /><label for="${rndId}" id="lbl-${rndId}" style="display:block;width:100%;height:100%;cursor:pointer;"></label>`;
    document.body.appendChild(tempDiv);
    const dynLabel = document.getElementById(`lbl-${rndId}`);
    if (dynLabel) {
      dynLabel.click();
    }
    setTimeout(() => {
      tempDiv.remove();
    }, 120);
  } catch {}

  // 2. Reforço háptico acústico no chassi
  try {
    tocarPulsoHapticoAudio();
  } catch {}

  // 3. Dispositivos Android e navegadores padrão com Web Vibration API
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(padrao);
    } catch {}
  }
}
