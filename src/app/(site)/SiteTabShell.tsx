"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { AcervoView } from "./views/AcervoView";
import { VenderView } from "./views/VenderView";
import { SobreView } from "./views/SobreView";
import { ClienteContaView } from "./views/ClienteContaView";
import { dispararVibracao as vibrar } from "@/lib/haptics";
import type { Watch } from "@/lib/types";

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
  pecas: Watch[];
  saudacao: string;
  boasVindas: boolean;
}

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

  // Em um container flex com 4 abas (largura 400%), cada aba representa 25% do container
  // Aba 0 = 0% | Aba 1 = -25% | Aba 2 = -50% | Aba 3 = -75%
  const xPercent = useMotionValue(-initialTab * 25);
  const transformStyle = useTransform(xPercent, (val) => `${val}%`);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureLockRef = useRef<"horizontal" | "vertical" | null>(null);
  const hasSwipedRef = useRef(false);
  /** O gesto atual começou na barra inferior, que também é superfície de arrasto. */
  const barraNoGestoRef = useRef(false);
  /** Virou arrasto lá dentro — o clique que o navegador manda depois é lixo. */
  const arrastouNaBarraRef = useRef(false);
  /** Geometria da barra no início do gesto: é ela que traduz dedo em aba. */
  const barraCaixaRef = useRef<DOMRect | null>(null);
  /** O switch nativo sob o dedo — é dele que sai o tique no iPhone. */
  const switchDaBarraRef = useRef<HTMLInputElement | null>(null);
  /** Rearme do switch: um tique por aba atravessada, não um por gesto. */
  const rearmeRef = useRef<{
    sw: HTMLInputElement;
    estado: boolean;
    tiques: number;
  } | null>(null);
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

      // Ponto único do retorno tátil: vibra quando a aba de fato vira, seja
      // por deslize, clique ou botão de voltar. Concentrar aqui evita vibrar
      // duas vezes no mesmo gesto (uma na travessia, outra ao soltar o dedo).
      // No iPhone nada acontece — ver src/lib/haptics.ts.
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

      const targetIdx = (SITE_ROTAS as readonly string[]).indexOf(href);
      if (targetIdx !== -1 && targetIdx !== currentTabRef.current) {
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
      const idx = (SITE_ROTAS as readonly string[]).indexOf(window.location.pathname);
      if (idx !== -1 && idx !== currentTabRef.current) {
        navegarParaAba(idx, true);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navegarParaAba]);

  // Gesto 1:1 de toque idêntico ao Instagram (permite arrastar sobre fotos de relógios)
  useEffect(() => {
    /**
     * Onde o dedo está, em abas, quando o gesto acontece sobre a barra.
     *
     * A conta é a geometria da barra, não a largura da tela: dedo no centro do
     * terceiro botão é aba 2, e o conteúdo mostra a aba que está sob o dedo.
     * Medir por deslocamento (uma tela arrastada = uma aba) obrigava a
     * percorrer a tela inteira para andar uma casa numa barra em que cada
     * botão tem um quarto disso — na prática o arrasto parecia não responder.
     */
    function posicaoNaBarra(clientX: number): number {
      const caixa = barraCaixaRef.current;
      if (!caixa || !caixa.width) return currentTabRef.current;
      const larguraBotao = caixa.width / SITE_ROTAS.length;
      const posicao = (clientX - caixa.left) / larguraBotao - 0.5;
      return Math.max(0, Math.min(SITE_ROTAS.length - 1, posicao));
    }

    /**
     * O switch acabou de virar, então o iPhone acabou de dar o tique. Devolvê-lo
     * ao estado anterior deixa o mesmo arrasto disparar de novo quando o dedo
     * cruzar o próximo botão — é o que dá **um tique por aba**, e não um por
     * gesto. Feito fora do despacho do evento, para não reentrar no controle
     * nativo no meio da própria mudança.
     */
    function aoTrocarSwitch() {
      const rearme = rearmeRef.current;
      if (!rearme) return;
      rearme.tiques += 1;
      if (rearme.tiques >= 8) return;
      requestAnimationFrame(() => {
        if (rearmeRef.current === rearme) rearme.sw.checked = rearme.estado;
      });
    }

    function soltarRearme() {
      const rearme = rearmeRef.current;
      if (!rearme) return;
      rearme.sw.removeEventListener("change", aoTrocarSwitch);
      rearmeRef.current = null;
    }

    function onClickCapture(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("label[id*='tab-label-'], input[id*='tab-input-']")) {
        // Arrastar na barra alterna o switch nativo do botão que está sob o
        // dedo, e o navegador ainda manda um clique no fim do gesto. Sem
        // engolir esse clique, o arrasto terminaria navegando para a aba
        // errada. Toque simples não passa por aqui: só arrasto marca a flag.
        if (arrastouNaBarraRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

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

      /*
       * A barra inferior também é superfície de arrasto — e no iPhone é a
       * única que vibra.
       *
       * Desde o iOS 26.5, só a manipulação física de um controle nativo
       * aciona a Taptic Engine (ver `src/lib/haptics.ts`). Os botões da barra
       * têm um switch transparente por cima, então arrastar o dedo ali é
       * arrastar o switch: o sistema dá o tique sozinho, sem passar por
       * JavaScript nenhum. Medido em iOS 26.6.
       *
       * Por isso o filtro de campos abaixo não vale para ela: os "inputs" da
       * barra são justamente os switches que precisam receber o dedo.
       */
      const barra = target?.closest<HTMLElement>("[data-swipe-nav]") ?? null;
      const naBarra = barra !== null;
      barraCaixaRef.current = barra ? barra.getBoundingClientRect() : null;
      switchDaBarraRef.current = naBarra
        ? target
            ?.closest("label[id*='tab-label-']")
            ?.querySelector<HTMLInputElement>("input[type='checkbox']") ?? null
        : null;

      if (!naBarra) {
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
      }

      barraNoGestoRef.current = naBarra;
      arrastouNaBarraRef.current = false;

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
        // Na barra não se previne nada: o gesto pertence ao switch nativo, e
        // é dele que vem o tique no iPhone. Cancelar o evento é justamente o
        // que tiraria o controle do sistema. A barra é fixa, então não há
        // rolagem para impedir.
        if (e.cancelable && !barraNoGestoRef.current) e.preventDefault();
        hasSwipedRef.current = true;

        if (barraNoGestoRef.current) {
          /*
           * Arma o switch para a direção do gesto, uma vez só, no primeiro
           * movimento — que é quando a direção passa a ser conhecida.
           *
           * Um switch desligado só tem um movimento possível: ligar, indo para
           * a direita. Arrastá-lo para a esquerda não muda estado nenhum, e
           * sem mudança de estado o iPhone não dá o tique — era por isso que
           * só um sentido vibrava. Escrever `.checked` por código não dispara
           * evento algum, então isso não mexe na navegação.
           */
          if (!arrastouNaBarraRef.current) {
            arrastouNaBarraRef.current = true;
            const sw = switchDaBarraRef.current;
            if (sw) {
              const estado = deltaX < 0;
              sw.checked = estado;
              // Rearma a cada tique: pular três abas num gesto dá três tiques,
              // não um. O teto existe para um arrasto longo não virar matraca.
              rearmeRef.current = { sw, estado, tiques: 0 };
              sw.addEventListener("change", aoTrocarSwitch);
            }
          }

          xPercent.set(-posicaoNaBarra(touch.clientX) * 25);
          return;
        }

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
      const arrastouNaBarra = arrastouNaBarraRef.current;
      barraNoGestoRef.current = false;
      soltarRearme();
      setTimeout(() => {
        hasSwipedRef.current = false;
        arrastouNaBarraRef.current = false;
      }, 150);

      /*
       * Arrasto na barra fecha pela posição do dedo, não pelo limiar de meia
       * tela que vale para o conteúdo — a barra tem 60px de altura e o gesto
       * inteiro cabe nela.
       *
       * Este caminho também é o que atende `touchcancel`: quando o switch
       * nativo assume o gesto, o WebKit cancela o toque em vez de encerrá-lo,
       * e sem tratar isso o conteúdo ficava parado no meio do caminho.
       */
      if (arrastouNaBarra) {
        navegarParaAba(Math.round(posicaoNaBarra(touch.clientX)), true);
        return;
      }

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


      navegarParaAba(targetIdx, true);
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
      soltarRearme();
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
