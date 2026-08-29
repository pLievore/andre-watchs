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

export function PainelTabShell({
  initialTab,
  admin,
  clientesData,
  dashboardData,
  negociacoesData,
  pecasData,
}: PainelTabShellProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const [arrastando, setArrastando] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Valor de translação em porcentagem negativa (ex: 0 = 0%, 1 = -100%, 2 = -200%)
  const xPercent = useMotionValue(-initialTab * 100);
  const transformStyle = useTransform(xPercent, (val) => `${val}%`);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureLockRef = useRef<"horizontal" | "vertical" | null>(null);

  // Navega para uma aba com animação física suave de mola
  const navegarParaAba = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex > 4) return;
      setCurrentTab(targetIndex);

      animate(xPercent, -targetIndex * 100, {
        type: "spring",
        stiffness: 380,
        damping: 34,
        onComplete: () => {
          setArrastando(false);
        },
      });

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

  // Escuta cliques no menu de navegação inferior/superior
  useEffect(() => {
    function onMudarAba(e: Event) {
      const customEvent = e as CustomEvent<string>;
      const href = customEvent.detail;
      const targetIdx = PAINEL_ROTAS.indexOf(href as any);
      if (targetIdx !== -1) {
        navegarParaAba(targetIdx);
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
      if (idx !== -1 && idx !== currentTab) {
        navegarParaAba(idx);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [currentTab, navegarParaAba]);

  // Listener de toque para arraste 1:1 real estilo Instagram
  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;

      const target = e.target as HTMLElement | null;

      // Não dispara swipe se tocou em inputs, sliders, seletores, botões interativos
      if (
        target?.closest(
          "input, textarea, select, button, a, [data-no-swipe], [role='slider'], .no-swipe"
        )
      ) {
        return;
      }

      // Ignora containers de rolagem horizontal própria (ex: gráfico ou tabela com scroll)
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
          setArrastando(true);
        }
      }

      if (gestureLockRef.current === "vertical") return;

      if (gestureLockRef.current === "horizontal") {
        if (e.cancelable) e.preventDefault();

        const screenWidth = window.innerWidth || 400;
        const deltaPercent = (deltaX / screenWidth) * 100;
        const basePercent = -currentTab * 100;

        let novoPercent = basePercent + deltaPercent;

        // Resistência elástica nas extremidades (rubber-band)
        if (currentTab === 0 && deltaX > 0) {
          novoPercent = basePercent + deltaPercent * 0.2;
        } else if (currentTab === 4 && deltaX < 0) {
          novoPercent = basePercent + deltaPercent * 0.2;
        }

        xPercent.set(novoPercent);
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
      const screenWidth = window.innerWidth || 400;
      const deltaPercent = (deltaX / screenWidth) * 100;

      touchStartRef.current = null;
      gestureLockRef.current = null;

      // Limiar: 16% da tela ou flick rápido (> 0.4px/ms)
      const limiar = 16;
      const foiRapido = Math.abs(velocity) > 0.4;

      let proximaAba = currentTab;

      if (deltaPercent < -limiar || (deltaPercent < -5 && foiRapido)) {
        if (currentTab < 4) {
          proximaAba = currentTab + 1;
        }
      } else if (deltaPercent > limiar || (deltaPercent > 5 && foiRapido)) {
        if (currentTab > 0) {
          proximaAba = currentTab - 1;
        }
      }

      if (proximaAba !== currentTab) {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try { navigator.vibrate(10); } catch {}
        }
      }

      navegarParaAba(proximaAba);
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
  }, [currentTab, xPercent, navegarParaAba]);

  return (
    <div className="relative w-full overflow-hidden">
      <motion.div
        style={{ x: transformStyle }}
        className="flex w-[500%] items-start will-change-transform"
      >
        {/* ── Aba 0: Clientes ────────────────────────────────────────────── */}
        <div
          className="w-[20%] min-w-[20%] shrink-0 px-0.5"
          style={{
            height: currentTab === 0 || arrastando ? "auto" : 0,
            overflow: currentTab === 0 || arrastando ? "visible" : "hidden",
            visibility: currentTab === 0 || arrastando ? "visible" : "hidden",
          }}
        >
          <ClientesView
            clientes={clientesData.clientes}
            pendentes={clientesData.pendentes}
            recusadas={clientesData.recusadas}
            convites={clientesData.convites}
          />
        </div>

        {/* ── Aba 1: Dashboard ───────────────────────────────────────────── */}
        <div
          className="w-[20%] min-w-[20%] shrink-0 px-0.5"
          style={{
            height: currentTab === 1 || arrastando ? "auto" : 0,
            overflow: currentTab === 1 || arrastando ? "visible" : "hidden",
            visibility: currentTab === 1 || arrastando ? "visible" : "hidden",
          }}
        >
          <DashboardView
            eventosRaw={dashboardData.eventosRaw}
            interessesRaw={dashboardData.interessesRaw}
            totalClientes={dashboardData.totalClientes}
            pecasAtivasRaw={dashboardData.pecasAtivasRaw}
          />
        </div>

        {/* ── Aba 2: Negociações ─────────────────────────────────────────── */}
        <div
          className="w-[20%] min-w-[20%] shrink-0 px-0.5"
          style={{
            height: currentTab === 2 || arrastando ? "auto" : 0,
            overflow: currentTab === 2 || arrastando ? "visible" : "hidden",
            visibility: currentTab === 2 || arrastando ? "visible" : "hidden",
          }}
        >
          <NegociacoesView
            totalAcessos={negociacoesData.totalAcessos}
            totalViuPeca={negociacoesData.totalViuPeca}
            totalWhatsApp={negociacoesData.totalWhatsApp}
            interessesRaw={negociacoesData.interessesRaw}
          />
        </div>

        {/* ── Aba 3: Peças ───────────────────────────────────────────────── */}
        <div
          className="w-[20%] min-w-[20%] shrink-0 px-0.5"
          style={{
            height: currentTab === 3 || arrastando ? "auto" : 0,
            overflow: currentTab === 3 || arrastando ? "visible" : "hidden",
            visibility: currentTab === 3 || arrastando ? "visible" : "hidden",
          }}
        >
          <PecasView pecas={pecasData.pecas} />
        </div>

        {/* ── Aba 4: Conta ───────────────────────────────────────────────── */}
        <div
          className="w-[20%] min-w-[20%] shrink-0 px-0.5"
          style={{
            height: currentTab === 4 || arrastando ? "auto" : 0,
            overflow: currentTab === 4 || arrastando ? "visible" : "hidden",
            visibility: currentTab === 4 || arrastando ? "visible" : "hidden",
          }}
        >
          <ContaView adminEmail={admin.email ?? ""} />
        </div>
      </motion.div>
    </div>
  );
}
