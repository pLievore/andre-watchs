"use client";

/**
 * Camada de fundo: pequenos glints de diamante caindo como chuva, atrás de
 * todo o conteúdo. Cintilam (twinkle) continuamente.
 *
 * Reação ao scroll: a velocidade de scroll "empurra" a chuva — rolar pra baixo
 * acelera a queda e estica as partículas em riscos de luz (motion-blur);
 * parar volta ao brilho suave. Dá a sensação de velocidade/precipitação.
 *
 * Perf: canvas 2D + sprites de glow pré-renderizados (drawImage é barato),
 * composição "lighter" (aditiva → brilho sobre o fundo escuro), dpr capado em 2.
 * Respeita prefers-reduced-motion (campo estático, sem queda).
 */

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  tw: number;
  twSpeed: number;
}

// Glow branco com falloff apertado = glint nítido (não um halo "fosco").
function makeSprite(): HTMLCanvasElement {
  const s = document.createElement("canvas");
  s.width = s.height = 32;
  const c = s.getContext("2d")!;
  const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.16, "rgba(255,255,255,0.32)");
  g.addColorStop(0.45, "rgba(255,255,255,0.05)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 32, 32);
  return s;
}

export function BackgroundSparkles() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles: Particle[] = [];

    const sprite = makeSprite();

    const makeP = (): Particle => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 0.8 + 0.3,
      speed: Math.random() * 14 + 7, // px/s de queda base
      tw: Math.random() * Math.PI * 2,
      twSpeed: Math.random() * 1.4 + 0.5,
    });

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      const n = Math.max(24, Math.min(110, Math.round((w * h) / 22000)));
      particles = Array.from({ length: n }, makeP);
    };

    resize();
    init();

    const drawGlint = (p: Particle, alpha: number, streak: number) => {
      // glow sutil e compacto
      const size = (p.r * 2 + 1.5) * (1 + alpha * 0.3) * 4;
      const ry = size * (1 + streak);
      ctx.globalAlpha = Math.min(1, alpha * 0.95);
      ctx.drawImage(sprite, p.x - size / 2, p.y - ry / 2, size, ry);
      // núcleo nítido (o "ponto" do diamante) — pequeno e branco
      ctx.globalAlpha = Math.min(1, alpha * 1.25);
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    };

    // ---- Reduced motion: campo estático, uma renderização ----
    if (reduce) {
      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) drawGlint(p, 0.5, 0);
      const onResizeStatic = () => {
        resize();
        init();
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (const p of particles) drawGlint(p, 0.5, 0);
      };
      window.addEventListener("resize", onResizeStatic);
      return () => window.removeEventListener("resize", onResizeStatic);
    }

    // ---- Scroll boost ----
    let boost = 0;
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      boost += y - lastScroll;
      lastScroll = y;
      boost = Math.max(-1500, Math.min(1500, boost));
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => {
      resize();
      init();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let last = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      boost *= 0.9; // decai suave
      const streak = Math.min(Math.abs(boost) * 0.0035, 3); // motion-blur vertical
      const push = boost * 0.12; // scroll acelera bem mais a queda

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      const ts = t / 1000;
      for (const p of particles) {
        p.y += (p.speed + push) * dt;
        p.x += Math.sin(ts * 0.3 + p.tw) * 0.04;
        if (p.y > h + 12) {
          p.y = -12;
          p.x = Math.random() * w;
        } else if (p.y < -12) {
          p.y = h + 12;
          p.x = Math.random() * w;
        }
        const tw = 0.22 + 0.6 * (0.5 + 0.5 * Math.sin(ts * p.twSpeed * 2 + p.tw));
        drawGlint(p, tw, streak);
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
