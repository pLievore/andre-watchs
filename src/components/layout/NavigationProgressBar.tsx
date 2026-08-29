"use client";

/**
 * Barra de progresso ultrafina e responsiva no topo da tela.
 * Responde a qualquer clique em links internos em 0ms, dando feedback
 * visual imediato de que a próxima página está sendo carregada.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

export function NavigationProgressBar({
  cor = "var(--color-accent)",
}: {
  cor?: string;
}) {
  const pathname = usePathname();
  const [carregando, setCarregando] = useState(false);

  // Conclui a barra e faz fade-out assim que a nova rota é confirmada
  useEffect(() => {
    setCarregando(false);
  }, [pathname]);

  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      // Ignora cliques com teclas modificadoras (abrir em nova aba)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement).closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !link.hasAttribute("download") &&
        link.getAttribute("target") !== "_blank" &&
        href !== pathname
      ) {
        setCarregando(true);
      }
    }

    document.addEventListener("click", aoClicar, { capture: true });
    return () => document.removeEventListener("click", aoClicar, { capture: true });
  }, [pathname]);

  return (
    <AnimatePresence>
      {carregando && (
        <motion.div
          key="barra-progresso"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 0.88 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{
            scaleX: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 0.18, ease: "easeOut" },
          }}
          className="fixed top-0 inset-x-0 h-[2.5px] z-[9999] pointer-events-none origin-left"
          style={{
            background: cor,
            boxShadow: `0 0 10px ${cor}, 0 0 3px ${cor}`,
          }}
        />
      )}
    </AnimatePresence>
  );
}
