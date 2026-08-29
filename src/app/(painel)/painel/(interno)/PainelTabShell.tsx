"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { ClientesView } from "./views/ClientesView";
import { DashboardView } from "./views/DashboardView";
import { NegociacoesView } from "./views/NegociacoesView";
import { PecasView } from "./views/PecasView";
import { ContaView } from "./views/ContaView";

export const PAINEL_ROTAS = [
  "/painel",
  "/painel/dashboard",
  "/painel/negociacoes",
  "/painel/pecas",
  "/painel/conta",
] as const;

interface PainelTabShellProps {
  initialTab: number;
  admin: { email?: string };
  clientesData: {
    clientes: any[];
    pendentes: any[];
    recusadas: any[];
    convites: any[];
  };
  dashboardData: {
    eventosRaw: any[];
    interessesRaw: any[];
    totalClientes: number;
    pecasAtivasRaw: any[];
  };
  negociacoesData: {
    totalAcessos: number;
    totalViuPeca: number;
    totalWhatsApp: number;
    interessesRaw: any[];
  };
  pecasData: {
    pecas: any[];
  };
}

import { dispararVibracao as vibrar } from "@/lib/haptics";

export function PainelTabShell({
  initialTab,
  admin,
  clientesData,
  dashboardData,
  negociacoesData,
  pecasData,
}: PainelTabShellProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const router = useRouter();
  const pathname = usePathname();

  // Em um container flex com 5 abas (largura 500%), cada aba representa 20% do container
  // Aba 0 = 0% | Aba 1 = -20% | Aba 2 = -40% | Aba 3 = -60% | Aba 4 = -80%
  const xPercent = useMotionValue(-initialTab * 20);
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
        "--painel-tab-progress",
        `${initialTab}`
      );
    }

    const unsubscribe = xPercent.on("change", (latest) => {
      const progress = Math.min(4, Math.max(0, -latest / 20));
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty(
          "--painel-tab-progress",
          progress.toFixed(4)
        );
      }

      // Vibração sutil e atualização da cor do ícone ao cruzar entre abas
      const rounded = Math.round(progress);
      if (rounded !== lastHapticTabRef.current) {
        lastHapticTabRef.current = rounded;
        vibrar(10);
        const hoverRota = PAINEL_ROTAS[rounded];
        if (hoverRota && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("painel:tab-mudou", { detail: hoverRota })
          );
        }
      }
    });

    return () => unsubscribe();
  }, [xPercent, initialTab]);

  // Navega para uma aba com animação física suave de mola que desliza pelas abas intermediárias
  const navegarParaAba = useCallback(
    (targetIndex: number, animar: boolean = true) => {
      if (targetIndex < 0 || targetIndex > 4) return;

      const prevIndex = currentTabRef.current;
      setCurrentTab(targetIndex);
      currentTabRef.current = targetIndex;

      const targetPercent = -targetIndex * 20;

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

      const novoCaminho = PAINEL_ROTAS[targetIndex];
      if (novoCaminho && typeof window !== "undefined") {
        window.history.replaceState(null, "", novoCaminho);
        window.dispatchEvent(
          new CustomEvent("painel:tab-mudou", { detail: novoCaminho })
        );
      }
    },
    [xPercent]
  );

  // Escuta cliques no menu de navegação (inferior mobile ou lateral desktop)
  useEffect(() => {
    function onMudarAba(e: Event) {
      const customEvent = e as CustomEvent<string>;
      const href = customEvent.detail;
      const targetIdx = PAINEL_ROTAS.indexOf(href as any);
      if (targetIdx !== -1 && targetIdx !== currentTabRef.current) {
        vibrar(12);
        navegarParaAba(targetIdx, true);
      }
    }

    window.addEventListener("painel:mudar-aba", onMudarAba);
    return () => {
      window.removeEventListener("painel:mudar-aba", onMudarAba);
    };
  }, [navegarParaAba]);

  // Sincroniza se o usuário usar o botão Voltar/Avançar do navegador
  useEffect(() => {
    function onPopState() {
      const idx = PAINEL_ROTAS.indexOf(window.location.pathname as any);
      if (idx !== -1 && idx !== currentTabRef.current) {
        vibrar(10);
        navegarParaAba(idx, true);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navegarParaAba]);

  // Listener de toque para arraste 1:1 real estilo Instagram (permite arrastar sobre tabelas e cards)
  useEffect(() => {
    function onClickCapture(e: MouseEvent) {
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

      // Não bloqueia links, cards ou botões: apenas campos de texto para digitação
      if (
        target?.closest(
          "input:not([type='button']):not([type='submit']), textarea, select, [role='slider'], [data-no-swipe], .no-swipe"
        )
      ) {
        return;
      }

      // Ignora containers com scroll horizontal próprio (ex: gráfico ou tabela interna)
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
        // Cada tela inteira arrastada corresponde a 20% do container de 500%
        const deltaPercent = (deltaX / screenWidth) * 20;
        const basePercent = -currentTabRef.current * 20;

        let novoPercent = basePercent + deltaPercent;

        // Resistência elástica de borda (rubber-band) nas extremidades
        if (currentTabRef.current === 0 && deltaX > 0) {
          novoPercent = basePercent + deltaPercent * 0.2;
        } else if (currentTabRef.current === 4 && deltaX < 0) {
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

      // Limiar: 16% da largura da tela ou flick rápido (> 0.35px/ms)
      const limiarPx = screenWidth * 0.16;
      const foiRapido = Math.abs(velocity) > 0.35;

      const activeIdx = currentTabRef.current;
      let targetIdx = activeIdx;

      // Arrastou para a esquerda -> Próxima Aba
      if (deltaX < -limiarPx || (deltaX < -25 && foiRapido)) {
        if (activeIdx < 4) {
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
        const targetLabel = document.getElementById(`painel-tab-label-${targetIdx}`);
        const targetInput = document.getElementById(`painel-tab-input-${targetIdx}`);
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
    <div className="relative w-full overflow-x-clip pb-12">
      <motion.div
        style={{ x: transformStyle }}
        className="flex w-[500%] items-start will-change-transform"
      >
        {/* ── Aba 0: Clientes (20% da largura do container = 100% da tela) ── */}
        <div className="w-[20%] min-w-[20%] shrink-0 px-1 sm:px-2">
          <ClientesView
            clientes={clientesData.clientes}
            pendentes={clientesData.pendentes}
            recusadas={clientesData.recusadas}
            convites={clientesData.convites}
          />
        </div>

        {/* ── Aba 1: Dashboard ───────────────────────────────────────────── */}
        <div className="w-[20%] min-w-[20%] shrink-0 px-1 sm:px-2">
          <DashboardView
            eventosRaw={dashboardData.eventosRaw}
            interessesRaw={dashboardData.interessesRaw}
            totalClientes={dashboardData.totalClientes}
            pecasAtivasRaw={dashboardData.pecasAtivasRaw}
          />
        </div>

        {/* ── Aba 2: Negociações ─────────────────────────────────────────── */}
        <div className="w-[20%] min-w-[20%] shrink-0 px-1 sm:px-2">
          <NegociacoesView
            totalAcessos={negociacoesData.totalAcessos}
            totalViuPeca={negociacoesData.totalViuPeca}
            totalWhatsApp={negociacoesData.totalWhatsApp}
            interessesRaw={negociacoesData.interessesRaw}
          />
        </div>

        {/* ── Aba 3: Peças ───────────────────────────────────────────────── */}
        <div className="w-[20%] min-w-[20%] shrink-0 px-1 sm:px-2">
          <PecasView pecas={pecasData.pecas} />
        </div>

        {/* ── Aba 4: Conta ───────────────────────────────────────────────── */}
        <div className="w-[20%] min-w-[20%] shrink-0 px-1 sm:px-2">
          <ContaView adminEmail={admin.email ?? ""} />
        </div>
      </motion.div>
    </div>
  );
}
