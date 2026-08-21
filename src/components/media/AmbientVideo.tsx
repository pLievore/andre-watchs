"use client";

/**
 * Vídeo ambiente — loop decorativo, sem som e sem controles.
 *
 * Performance (SPEC §8): `preload="none"` + IntersectionObserver. O `src` só é
 * atribuído quando o elemento entra na área de visão, então fora dela o custo é
 * apenas o poster. Ao sair, pausa.
 *
 * Reduced-motion (§3.4/§9): nem monta o `<video>` — renderiza só o poster.
 *
 * Não recebe texto por cima. Material de macro tem luminância imprevisível, e
 * copy sobreposta perde legibilidade (mesmo motivo do hero, SPEC §14 D11).
 */

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface AmbientVideoProps {
  src: string;
  poster: string;
  /** Descrição do que se vê — decorativo não quer dizer invisível. */
  label: string;
  /** Proporção do quadro, ex.: "9 / 16". */
  aspect?: string;
  className?: string;
}

export function AmbientVideo({
  src,
  poster,
  label,
  aspect = "9 / 16",
  className = "",
}: AmbientVideoProps) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || reduce) return;

    const io = new IntersectionObserver(
      ([entry]) => setInView(!!entry?.isIntersecting),
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView) {
      // Pode rejeitar antes de qualquer interação — silencioso é o certo,
      // o poster continua no lugar.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden border ${className}`}
      style={{ aspectRatio: aspect, borderColor: "var(--color-border)" }}
    >
      {reduce ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster={poster}
          src={inView ? src : undefined}
          preload="none"
          muted
          loop
          playsInline
          aria-label={label}
        />
      )}

      {/* Vinheta — costura o quadro no preto do site */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 95% at 50% 45%, transparent 68%, rgba(23,24,26,0.18) 100%)",
        }}
      />
    </div>
  );
}
