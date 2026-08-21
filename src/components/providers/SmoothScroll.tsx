"use client";

/**
 * Scroll suave global via Lenis (~3KB). Lenis dirige a posição de scroll REAL
 * da página suavizada, então o `useScroll` do Motion continua funcionando sem
 * fiação extra (diferente do GSAP/ScrollTrigger, que exigiria sync manual).
 *
 * Isso eleva todas as animações scroll-driven já existentes (scrubbing do hero,
 * pin do carrossel, reveals do EthosBand) — o movimento fica "manteiga".
 *
 * Respeita prefers-reduced-motion: §10 / §3.4 → desativa o smooth e devolve
 * scroll nativo.
 */

import { ReactLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        // Modo "lerp": a cada frame o scroll caminha essa fração da distância
        // até o alvo. Valor BAIXO = deslize longo depois que o usuário solta.
        //
        // 0.18 (valor anterior) seguia o dedo de perto demais e o movimento
        // parava no mesmo instante que a rolagem. 0.085 dá ~0,5s de deslize —
        // pé fora do acelerador em vez de freio (D12).
        //
        // O hero soma a isso a própria mola superamortecida (ver HeroBand),
        // porque a peça precisa desacelerar mais que a página.
        lerp: 0.085,
        smoothWheel: true,
        // touch usa scroll nativo (mais previsível no mobile)
        syncTouch: false,
      }}
    >
      {children}
    </ReactLenis>
  );
}
