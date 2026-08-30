"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getTabDirection, PAINEL_TABS } from "@/lib/tab-transitions";

let lastPainelPath: string | null = null;

export default function PainelTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Nas abas primárias do painel, o PainelTabShell gerencia o ViewPager contínuo com todas as telas em memória
  const isPrimaryTab = (PAINEL_TABS as readonly string[]).includes(pathname);

  const [direction] = useState(() => {
    const dir = getTabDirection(PAINEL_TABS, lastPainelPath, pathname);
    lastPainelPath = pathname;
    return dir;
  });

  if (isPrimaryTab) {
    return <div className="w-full">{children}</div>;
  }

  // Em páginas de detalhe/sub-rotas (/pecas/nova, etc.), mantém transição suave
  return (
    <motion.div
      initial={
        reduceMotion || direction === 0
          ? { opacity: 0 }
          : { opacity: 0, x: direction * 22 }
      }
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full"
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
