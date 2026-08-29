"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getTabDirection, SITE_TABS } from "@/lib/tab-transitions";

let lastSitePath: string | null = null;

const SITE_ROTAS_LIST = ["/acervo", "/vender", "/sobre", "/acervo/conta"];

export default function SiteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Nas abas primárias do site/vitrine, o SiteTabShell gerencia o ViewPager contínuo com todas as telas em memória
  const isPrimaryTab = SITE_ROTAS_LIST.includes(pathname);

  const [direction] = useState(() => {
    if (pathname === "/") {
      lastSitePath = "/";
      return 0;
    }
    const dir = getTabDirection(SITE_TABS, lastSitePath, pathname);
    lastSitePath = pathname;
    return dir;
  });

  if (isPrimaryTab) {
    return <div className="w-full">{children}</div>;
  }

  // Em sub-páginas (/acesso, /acervo/[slug], etc.), mantém transição suave
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
