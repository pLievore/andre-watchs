"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { getTabDirection, SITE_TABS } from "@/lib/tab-transitions";
import { InteractiveTabSlider } from "@/components/layout/InteractiveTabSlider";

let lastSitePath: string | null = null;

export default function SiteTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [direction] = useState(() => {
    // Na landing page principal ("/"), preservamos o alinhamento do canvas do hero sem deslocamento horizontal
    if (pathname === "/") {
      lastSitePath = "/";
      return 0;
    }
    const dir = getTabDirection(SITE_TABS, lastSitePath, pathname);
    lastSitePath = pathname;
    return dir;
  });

  return (
    <InteractiveTabSlider tabs={SITE_TABS} disabled={pathname === "/"}>
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
    </InteractiveTabSlider>
  );
}
