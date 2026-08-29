"use client";

/**
 * InteractiveTabSlider
 * 
 * Navegação por abas com arraste interativo 1:1 estilo Instagram:
 * - O conteúdo se move em tempo real acompanhando a ponta do polegar.
 * - Mostra a "prévia" real da aba adjacente surgindo da lateral.
 * - Se o movimento não for completado (abaixo do limiar), retorna suavemente com mola física (snap-back).
 * - Se passar do limiar (ou movimento rápido), completa o deslizamento e avança de aba.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animate, motion, useMotionValue } from "motion/react";

export interface TabInfo {
  href: string;
  rotulo: string;
  secao: string;
  descricao: string;
  tipo: "clientes" | "dashboard" | "negociacoes" | "pecas" | "conta" | "acervo" | "vender" | "sobre";
}

const TAB_METADATA: Record<string, TabInfo> = {
  "/painel": {
    href: "/painel",
    rotulo: "Clientes",
    secao: "CENTRAL DE MEMBROS",
    descricao: "Controle de acesso exclusivo, aprovação de convites e base de colecionadores.",
    tipo: "clientes",
  },
  "/painel/dashboard": {
    href: "/painel/dashboard",
    rotulo: "Dashboard",
    secao: "BI & ANALYTICS HOROLÓGICO",
    descricao: "Volume diário de interações, funil de conversão e geolocalização em tempo real.",
    tipo: "dashboard",
  },
  "/painel/negociacoes": {
    href: "/painel/negociacoes",
    rotulo: "Negociações",
    secao: "PIPELINE EM MESA",
    descricao: "Propostas comerciais ativas, intenções de compra, trocas e consignações.",
    tipo: "negociacoes",
  },
  "/painel/pecas": {
    href: "/painel/pecas",
    rotulo: "Peças",
    secao: "ACERVO & ESTOQUE",
    descricao: "Catálogo de alta relojoaria, especificações técnicas, fotografias e valores.",
    tipo: "pecas",
  },
  "/painel/conta": {
    href: "/painel/conta",
    rotulo: "Conta",
    secao: "ACESSO ADMINISTRATIVO",
    descricao: "Credenciais de segurança, dados de autenticação e sessão do operador.",
    tipo: "conta",
  },
  "/acervo": {
    href: "/acervo",
    rotulo: "Acervo",
    secao: "CATÁLOGO EXCLUSIVO",
    descricao: "Coleção de relógios de luxo com autenticidade e procedência conferidas.",
    tipo: "acervo",
  },
  "/vender": {
    href: "/vender",
    rotulo: "Vender",
    secao: "AVALIAÇÃO & CONIGNAÇÃO",
    descricao: "Avaliação técnica criteriosa na mesa da Andre Watches.",
    tipo: "vender",
  },
  "/sobre": {
    href: "/sobre",
    rotulo: "A casa",
    secao: "DESDE 2012",
    descricao: "A tradição, o rigor horológico e a história da maison.",
    tipo: "sobre",
  },
  "/acervo/conta": {
    href: "/acervo/conta",
    rotulo: "Conta",
    secao: "ÁREA DO MEMBRO",
    descricao: "Acompanhe seus relógios favoritados e intenções enviadas.",
    tipo: "conta",
  },
};

interface InteractiveTabSliderProps {
  children: React.ReactNode;
  tabs: readonly string[];
  disabled?: boolean;
}

export function InteractiveTabSlider({
  children,
  tabs,
  disabled = false,
}: InteractiveTabSliderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const x = useMotionValue(0);

  // Não ativa swipe em páginas de formulário/edição profunda
  const isDeepForm =
    pathname.includes("/pecas/nova") ||
    pathname.includes("/clientes/novo") ||
    Boolean(pathname.match(/\/pecas\/[^/]+$/)) ||
    Boolean(pathname.match(/\/clientes\/[^/]+$/));

  const estaDesativado = disabled || isDeepForm;

  // Determina abas adjacentes
  const currentIdx = tabs.indexOf(pathname);
  const proximaRota = currentIdx >= 0 && currentIdx < tabs.length - 1 ? tabs[currentIdx + 1] : null;
  const rotaAnterior = currentIdx > 0 ? tabs[currentIdx - 1] : null;

  const proximaAba = proximaRota ? TAB_METADATA[proximaRota] : null;
  const abaAnterior = rotaAnterior ? TAB_METADATA[rotaAnterior] : null;

  // Estado do gesto
  const [arrastando, setArrastando] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureLockRef = useRef<"horizontal" | "vertical" | null>(null);

  // Reseta posição 'x' quando a rota mudar
  useEffect(() => {
    x.set(0);
    setArrastando(false);
  }, [pathname, x]);

  // Pré-carrega abas adjacentes imediatamente
  useEffect(() => {
    if (proximaRota) router.prefetch(proximaRota);
    if (rotaAnterior) router.prefetch(rotaAnterior);
  }, [proximaRota, rotaAnterior, router]);

  useEffect(() => {
    if (estaDesativado) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;

      const target = e.target as HTMLElement | null;

      // Ignora se começou em inputs, sliders, seletores, botões ou carrosséis horizontais
      if (
        target?.closest(
          "input, textarea, select, button, a, [data-no-swipe], [role='slider'], .no-swipe"
        )
      ) {
        return;
      }

      const horizontalScroll = target?.closest(".overflow-x-auto, .overflow-x-scroll");
      if (horizontalScroll && horizontalScroll.scrollWidth > horizontalScroll.clientWidth) {
        return;
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      gestureLockRef.current = null;
    }

    function onTouchMove(e: TouchEvent) {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Trava de direção nos primeiros movimentos
      if (!gestureLockRef.current) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX && absY > 8) {
          gestureLockRef.current = "vertical";
          return;
        }

        if (absX > absY && absX > 8) {
          gestureLockRef.current = "horizontal";
          setArrastando(true);
        }
      }

      // Se for rolagem vertical natural, deixa o navegador rolar sem intervenção
      if (gestureLockRef.current === "vertical") return;

      // Se for swipe horizontal interativo:
      if (gestureLockRef.current === "horizontal") {
        if (e.cancelable) e.preventDefault();

        // Arrastando para a esquerda (quer ver a próxima aba)
        if (deltaX < 0) {
          if (proximaAba) {
            x.set(deltaX);
          } else {
            // Resistência elástica de borda (rubber-band) na última aba
            x.set(deltaX * 0.22);
          }
        }
        // Arrastando para a direita (quer ver a aba anterior)
        else {
          if (abaAnterior) {
            x.set(deltaX);
          } else {
            // Resistência elástica de borda na primeira aba
            x.set(deltaX * 0.22);
          }
        }
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStartRef.current || gestureLockRef.current !== "horizontal") {
        touchStartRef.current = null;
        gestureLockRef.current = null;
        setArrastando(false);
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        gestureLockRef.current = null;
        setArrastando(false);
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const duration = Date.now() - touchStartRef.current.time;
      const velocity = deltaX / Math.max(duration, 1);

      touchStartRef.current = null;
      gestureLockRef.current = null;

      // Limiar para completar: 70px ou velocidade rápida de flick (> 0.45px/ms)
      const limiar = 70;
      const foiRapido = Math.abs(velocity) > 0.45;

      // 1. Arrastou para a esquerda -> Próxima Aba
      if (deltaX < -limiar || (deltaX < -30 && foiRapido)) {
        if (proximaAba) {
          // Vibração tátil
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate(10); } catch {}
          }

          // Desliza suavemente até o final e navega
          const larguraTela = typeof window !== "undefined" ? window.innerWidth : 400;
          animate(x, -larguraTela, {
            duration: 0.22,
            ease: [0.16, 1, 0.3, 1],
            onComplete: () => {
              router.push(proximaAba.href);
            },
          });
          return;
        }
      }

      // 2. Arrastou para a direita -> Aba Anterior
      if (deltaX > limiar || (deltaX > 30 && foiRapido)) {
        if (abaAnterior) {
          // Vibração tátil
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            try { navigator.vibrate(10); } catch {}
          }

          const larguraTela = typeof window !== "undefined" ? window.innerWidth : 400;
          animate(x, larguraTela, {
            duration: 0.22,
            ease: [0.16, 1, 0.3, 1],
            onComplete: () => {
              router.push(abaAnterior.href);
            },
          });
          return;
        }
      }

      // 3. NÃO COMPLETOU O MOVIMENTO -> RETORNO COM MOLA FÍSICA (Snap-Back)
      // "se você não completar o movimento ele não vai"
      animate(x, 0, {
        type: "spring",
        stiffness: 450,
        damping: 32,
        onComplete: () => {
          setArrastando(false);
        },
      });
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [estaDesativado, proximaAba, abaAnterior, router, x]);

  return (
    <div className="relative w-full overflow-visible">
      <motion.div
        style={{ x }}
        className="relative w-full"
      >
        {/* ── Conteúdo da Aba Atual ────────────────────────────────────── */}
        <div className="w-full">{children}</div>

        {/* ── Prévia da Próxima Aba (Surgindo da Direita) ─────────────── */}
        {proximaAba && (
          <div
            className="absolute top-0 bottom-0 left-full w-full pl-4 pointer-events-none"
            style={{ display: arrastando ? "block" : "none" }}
            aria-hidden
          >
            <TabPreviewCard tab={proximaAba} />
          </div>
        )}

        {/* ── Prévia da Aba Anterior (Surgindo da Esquerda) ───────────── */}
        {abaAnterior && (
          <div
            className="absolute top-0 bottom-0 right-full w-full pr-4 pointer-events-none"
            style={{ display: arrastando ? "block" : "none" }}
            aria-hidden
          >
            <TabPreviewCard tab={abaAnterior} />
          </div>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Card de prévia elegante que surge da lateral durante o gesto de arraste,
 * mostrando o cabeçalho, badge de autenticidade e esqueleto da aba que está entrando.
 */
function TabPreviewCard({ tab }: { tab: TabInfo }) {
  return (
    <div
      className="w-full h-full min-h-[460px] border rounded-sm p-5 flex flex-col gap-6 shadow-2xl backdrop-blur-sm"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-surface)",
      }}
    >
      {/* Topo da Prévia */}
      <div className="flex flex-col gap-2 border-b pb-5" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] uppercase font-mono tracking-widest font-semibold px-2 py-0.5 rounded"
            style={{
              background: "rgba(194, 168, 117, 0.12)",
              color: "var(--color-accent)",
            }}
          >
            {tab.secao}
          </span>
          <span className="meta text-xs font-mono">Prévia</span>
        </div>
        <h3
          className="text-xl sm:text-2xl font-normal"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
            color: "var(--color-foreground)",
          }}
        >
          {tab.rotulo}
        </h3>
        <p className="meta text-xs leading-relaxed">
          {tab.descricao}
        </p>
      </div>

      {/* Esqueleto Temático da Aba */}
      <div className="flex flex-col gap-3.5 opacity-60 animate-pulse">
        {tab.tipo === "dashboard" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-14 rounded border border-white/5 bg-white/5" />
              <div className="h-14 rounded border border-white/5 bg-white/5" />
              <div className="h-14 rounded border border-white/5 bg-white/5" />
            </div>
            <div className="h-32 rounded border border-white/5 bg-white/5" />
          </>
        )}

        {tab.tipo === "clientes" && (
          <>
            <div className="h-16 rounded border border-white/5 bg-white/5" />
            <div className="h-16 rounded border border-white/5 bg-white/5" />
            <div className="h-16 rounded border border-white/5 bg-white/5" />
          </>
        )}

        {tab.tipo === "pecas" && (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="h-28 rounded border border-white/5 bg-white/5" />
              <div className="h-28 rounded border border-white/5 bg-white/5" />
            </div>
            <div className="h-16 rounded border border-white/5 bg-white/5" />
          </>
        )}

        {tab.tipo === "negociacoes" && (
          <>
            <div className="h-20 rounded border border-white/5 bg-white/5" />
            <div className="h-20 rounded border border-white/5 bg-white/5" />
          </>
        )}

        {tab.tipo === "conta" && (
          <div className="h-40 rounded border border-white/5 bg-white/5" />
        )}

        {(tab.tipo === "acervo" || tab.tipo === "vender" || tab.tipo === "sobre") && (
          <>
            <div className="h-36 rounded border border-white/5 bg-white/5" />
            <div className="h-20 rounded border border-white/5 bg-white/5" />
          </>
        )}
      </div>
    </div>
  );
}
