"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { AcervoView } from "./views/AcervoView";
import { VenderView } from "./views/VenderView";
import { SobreView } from "./views/SobreView";
import { ClienteContaView } from "./views/ClienteContaView";

export const SITE_ROTAS = [
  "/acervo",
  "/vender",
  "/sobre",
  "/acervo/conta",
] as const;

interface SiteTabShellProps {
  initialTab: number;
  isAdmin: boolean;
  cliente: { nome: string; email: string; telefone: string } | null;
  pecas: any[];
  saudacao: string;
  boasVindas: boolean;
}

import { dispararVibracao as vibrar } from "@/lib/haptics";

export function SiteTabShell({
  initialTab,
  isAdmin,
  cliente,
  pecas,
  saudacao,
  boasVindas,
}: SiteTabShellProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const router = useRouter();
  const pathname = usePathname();

  // Em um container flex com 4 abas (largura 400%), cada aba representa 25% do container
  // Aba 0 = 0% | Aba 1 = -25% | Aba 2 = -50% | Aba 3 = -75%
  const xPercent = useMotionValue(-initialTab * 25);
  const transformStyle = useTransform(xPercent, (val) => `${val}%`);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureLockRef = useRef<"horizontal" | "vertical" | null>(null);
  const hasSwipedRef = useRef(false);
  const lastHapticTabRef = useRef(initialTab);
  const currentTabRef = useRef(initialTab);
  currentTabRef.current = currentTab;

  // Sincroniza em tempo real a linha indicadora da barra de navegação com o deslize do dedo
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(
        "--site-tab-progress",
        `${initialTab}`
      );
    }

    const unsubscribe = xPercent.on("change", (latest) => {
      const progress = Math.min(3, Math.max(0, -latest / 25));
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--site-tab-progress",
          progress.toFixed(4)
        );
      }

      // Vibração sutil e atualização da cor do ícone ao cruzar entre abas
      const rounded = Math.round(progress);
      if (rounded !== lastHapticTabRef.current) {
        lastHapticTabRef.current = rounded;
        vibrar(10);
        const hoverRota = SITE_ROTAS[rounded];
        if (hoverRota && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("cliente:tab-mudou", { detail: hoverRota })
          );
        }
      }
    });

    return () => unsubscribe();
  }, [xPercent, initialTab]);

  const navegarParaAba = useCallback(
    (targetIndex: number, animar: boolean = true) => {
      if (targetIndex < 0 || targetIndex > 3) return;

      // Se for admin clicando no 4º botão (painel), redireciona para o painel
      if (targetIndex === 3 && isAdmin) {
        router.push("/painel");
        return;
      }

      const prevIndex = currentTabRef.current;
      setCurrentTab(targetIndex);
      currentTabRef.current = targetIndex;

      const targetPercent = -targetIndex * 25;

      if (animar) {
        const deltaTabs = Math.abs(targetIndex - prevIndex);
        // Quando a aba for distante (> 1 aba), ajustamos a física para o deslizamento
        // através de todas as abas intermediárias ser contínuo, nítido e fluido
        const stiffness = deltaTabs > 1 ? 260 : 380;
        const damping = deltaTabs > 1 ? 32 : 36;
        const mass = deltaTabs > 1 ? 0.85 : 1;

        animate(xPercent, targetPercent, {
          type: "spring",
          stiffness,
          damping,
          mass,
        });

        if (typeof window !== "undefined" && window.scrollY > 60) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        xPercent.set(targetPercent);
      }

      const novoCaminho = SITE_ROTAS[targetIndex];
      if (novoCaminho && typeof window !== "undefined") {
        window.history.replaceState(null, "", novoCaminho);
        window.dispatchEvent(
          new CustomEvent("cliente:tab-mudou", { detail: novoCaminho })
        );
      }
    },
    [xPercent, isAdmin, router]
  );

  // Escuta cliques no menu de navegação móvel
  useEffect(() => {
    function onMudarAba(e: Event) {
      const customEvent = e as CustomEvent<string>;
      const href = customEvent.detail;

      if (href === "/painel") {
        router.push("/painel");
        return;
      }

      const targetIdx = SITE_ROTAS.indexOf(href as any);
      if (targetIdx !== -1 && targetIdx !== currentTabRef.current) {
        vibrar(12);
        navegarParaAba(targetIdx, true);
      }
    }

    window.addEventListener("cliente:mudar-aba", onMudarAba);
    return () => {
      window.removeEventListener("cliente:mudar-aba", onMudarAba);
    };
  }, [navegarParaAba, router]);

  // Sincroniza quando o usuário usa o botão Voltar/Avançar
  useEffect(() => {
    function onPopState() {
      const idx = SITE_ROTAS.indexOf(window.location.pathname as any);
      if (idx !== -1 && idx !== currentTabRef.current) {
        vibrar(10);
        navegarParaAba(idx, true);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navegarParaAba]);

  // Gesto 1:1 de toque idêntico ao Instagram (permite arrastar sobre fotos de relógios)
  useEffect(() => {
    function onClickCapture(e: MouseEvent) {
      // Se o usuário realizou um gesto de swipe horizontal, cancela o clique do link/foto
      if (hasSwipedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        hasSwipedRef.current = false;
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;

      const target = e.target as HTMLElement | null;

      // Não bloqueia links ou fotos de relógios: apenas campos de digitação
      if (
        target?.closest(
          "input:not([type='button']):not([type='submit']), textarea, select, [role='slider'], [data-no-swipe], .no-swipe"
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

      if (!gestureLockRef.current) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX && absY > 8) {
          gestureLockRef.current = "vertical";
          return;
        }

        if (absX > absY && absX > 8) {
          gestureLockRef.current = "horizontal";
          hasSwipedRef.current = true;
        }
      }

      if (gestureLockRef.current === "vertical") return;

      if (gestureLockRef.current === "horizontal") {
        if (e.cancelable) e.preventDefault();
        hasSwipedRef.current = true;

        const screenWidth = window.innerWidth || 400;
        const deltaPercent = (deltaX / screenWidth) * 25;
        const basePercent = -currentTabRef.current * 25;

        let novoPercent = basePercent + deltaPercent;

        if (currentTabRef.current === 0 && deltaX > 0) {
          novoPercent = basePercent + deltaPercent * 0.2;
        } else if (currentTabRef.current === 3 && deltaX < 0) {
          novoPercent = basePercent + deltaPercent * 0.2;
        }

        xPercent.set(novoPercent);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!touchStartRef.current || gestureLockRef.current !== "horizontal") {
        touchStartRef.current = null;
        gestureLockRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      if (!touch) {
        touchStartRef.current = null;
        gestureLockRef.current = null;
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const duration = Date.now() - touchStartRef.current.time;
      const velocity = deltaX / Math.max(duration, 1);
      const screenWidth = window.innerWidth || 400;

      touchStartRef.current = null;
      gestureLockRef.current = null;

      // Mantém a flag de swipe ativa brevemente para engolir o evento click gerado pelo navegador
      hasSwipedRef.current = true;
      setTimeout(() => {
        hasSwipedRef.current = false;
      }, 150);

      const limiarPx = screenWidth * 0.16;
      const foiRapido = Math.abs(velocity) > 0.35;

      const activeIdx = currentTabRef.current;
      let targetIdx = activeIdx;

      // Arrastou para a esquerda -> Próxima Aba
      if (deltaX < -limiarPx || (deltaX < -25 && foiRapido)) {
        if (activeIdx < 3) {
          targetIdx = activeIdx + 1;
        }
      }
      // Arrastou para a direita -> Aba Anterior
      else if (deltaX > limiarPx || (deltaX > 25 && foiRapido)) {
        if (activeIdx > 0) {
          targetIdx = activeIdx - 1;
        }
      }

      if (targetIdx !== activeIdx) {
        const targetLabel = document.getElementById(`cliente-tab-label-${targetIdx}`);
        const targetInput = document.getElementById(`cliente-tab-input-${targetIdx}`);
        if (targetLabel) {
          targetLabel.click();
        } else if (targetInput) {
          targetInput.click();
        } else {
          vibrar(12);
          navegarParaAba(targetIdx, true);
        }
      } else {
        navegarParaAba(activeIdx, true);
      }
    }

    window.addEventListener("click", onClickCapture, { capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("click", onClickCapture, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [xPercent, navegarParaAba]);

  return (
    <div className="relative w-full overflow-x-clip pb-16">
      <motion.div
        style={{ x: transformStyle }}
        className="flex w-[400%] items-start will-change-transform"
      >
        {/* ── Aba 0: Acervo (25% do container = 100% da tela) ────────────── */}
        <div className="w-[25%] min-w-[25%] shrink-0">
          <AcervoView
            isAdmin={isAdmin}
            cliente={cliente}
            pecas={pecas}
            saudacao={saudacao}
            boasVindas={boasVindas}
          />
        </div>

        {/* ── Aba 1: Vender ──────────────────────────────────────────────── */}
        <div className="w-[25%] min-w-[25%] shrink-0">
          <VenderView />
        </div>

        {/* ── Aba 2: A casa ──────────────────────────────────────────────── */}
        <div className="w-[25%] min-w-[25%] shrink-0">
          <SobreView />
        </div>

        {/* ── Aba 3: Conta ───────────────────────────────────────────────── */}
        <div className="w-[25%] min-w-[25%] shrink-0">
          <ClienteContaView cliente={cliente} isAdmin={isAdmin} />
        </div>
      </motion.div>
    </div>
  );
}
