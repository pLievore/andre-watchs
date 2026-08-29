"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis, useLenis } from "lenis/react";
import { useReducedMotion } from "motion/react";

function ScrollResetOnRouteChange() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    // Garante que qualquer troca de rota (especialmente pós-login) vá ao topo absoluto
    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.085,
        smoothWheel: true,
        syncTouch: false,
      }}
    >
      <ScrollResetOnRouteChange />
      {children}
    </ReactLenis>
  );
}