"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { getAdjacentTab } from "@/lib/tab-transitions";

interface UseSwipeTabsOptions {
  tabs: readonly string[];
  disabled?: boolean;
}

/**
 * Hook de detecção de gestos de arraste (swipe) horizontal no mobile,
 * idêntico ao Instagram, para alternar abas fluidamente para a esquerda e direita.
 */
export function useSwipeTabs({ tabs, disabled = false }: UseSwipeTabsOptions) {
  const pathname = usePathname();
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (!touch) return;
      const target = e.target as HTMLElement | null;

      // Não dispara swipe se o toque começou em inputs, sliders, seletores, botões interativos
      if (
        target?.closest(
          "input, textarea, select, button, a, [data-no-swipe], [role='slider'], .no-swipe"
        )
      ) {
        return;
      }

      // Não dispara se começou dentro de um container com scroll horizontal ativo (ex: carrossel ou tabela horizontal)
      const horizontalScroll = target?.closest(".overflow-x-auto, .overflow-x-scroll");
      if (horizontalScroll && horizontalScroll.scrollWidth > horizontalScroll.clientWidth) {
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStartRef.current || e.changedTouches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const duration = Date.now() - touchStartRef.current.time;
      touchStartRef.current = null;

      // Critérios para distinguir swipe intencional de scroll vertical ou tap:
      // 1. Gesto ágil (menos de 450ms)
      // 2. Deslocamento horizontal de pelo menos 55px
      // 3. O deslocamento horizontal deve ser pelo menos 1.5x maior que o vertical
      if (
        duration < 450 &&
        Math.abs(deltaX) > 55 &&
        Math.abs(deltaX) > Math.abs(deltaY) * 1.5
      ) {
        const direction = deltaX < 0 ? "left" : "right";
        const nextTab = getAdjacentTab(tabs, pathname, direction);

        if (nextTab && nextTab !== pathname) {
          // Feedback tátil sutil se suportado pelo smartphone
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(12);
            } catch {}
          }

          router.push(nextTab);
        }
      }
    }

    // Registra listeners passivos para 100% de performance sem travar a rolagem vertical
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [tabs, pathname, router, disabled]);
}
