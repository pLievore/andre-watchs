"use client";

import { useEffect, useLayoutEffect } from "react";
import { useLenis } from "lenis/react";

export function AcervoScrollTop() {
  const lenis = useLenis();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    lenis?.scrollTo(0, { immediate: true });
  }, [lenis]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    lenis?.scrollTo(0, { immediate: true });
  }, [lenis]);

  return null;
}