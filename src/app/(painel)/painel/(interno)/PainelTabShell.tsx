"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { ClientesView } from "./views/ClientesView";
import { DashboardView } from "./views/DashboardView";
import { NegociacoesView } from "./views/NegociacoesView";
import { PecasView } from "./views/PecasView";
import { ContaView } from "./views/ContaView";
import { dispararVibracao as vibrar } from "@/lib/haptics";

// Só o tipo: `import type` é apagado na compilação, então o módulo de dados
// (que abre a chave secret) não é arrastado para o bundle do navegador.
import type { DadosPainel } from "./dados-painel";

export const PAINEL_ROTAS = [
  "/painel",
  "/painel/dashboard",
  "/painel/negociacoes",
  "/painel/pecas",
  "/painel/conta",
] as const;

/**
 * As props são exatamente o que `carregarDadosPainel` devolve — a página faz
 * `{...dados}`. Derivar do carregador em vez de redeclarar `any[]` mantém a
 * checagem viva na travessia servidor -> cliente.
 */
type PainelTabShellProps = DadosPainel & { initialTab: number };

export function PainelTabShell({
  initialTab,
  admin,
  clientesData,
  dashboardData,
  negociacoesData,
  pecasData,
}: PainelTabShellProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);

  // Em um container flex com 5 abas (largura 500%), cada aba representa 20% do container
  // Aba 0 = 0% | Aba 1 = -20% | Aba 2 = -40% | Aba 3 = -60% | Aba 4 = -80%
  const xPercent = useMotionValue(-initialTab * 20);
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

      // Ponto único do retorno tátil: vibra quando a aba de fato vira, seja
      // por deslize, clique ou botão de voltar. Concentrar aqui evita vibrar
      // duas vezes no mesmo gesto (uma na travessia, outra ao soltar o dedo).
      // No iPhone nada acontece — ver src/lib/haptics.ts.
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
      const targetIdx = (PAINEL_ROTAS as readonly string[]).indexOf(href);
      if (targetIdx !== -1 && targetIdx !== currentTabRef.current) {
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
      const idx = (PAINEL_ROTAS as readonly string[]).indexOf(window.location.pathname);
      if (idx !== -1 && idx !== currentTabRef.current) {
        navegarParaAba(idx, true);
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navegarParaAba]);

  // Listener de toque para arraste 1:1 real estilo Instagram (permite arrastar sobre tabelas e cards)
  useEffect(() => {
    /**
     * Onde o dedo está, em abas, quando o gesto acontece sobre a barra.
     *
     * A conta é a geometria da barra, não a largura da tela: dedo no centro do
     * terceiro botão é aba 2, e o conteúdo mostra a aba que está sob o dedo.
     * Medir por deslocamento obrigava a percorrer a tela inteira para andar
     * uma casa numa barra em que cada botão tem um quinto disso.
     */
    function posicaoNaBarra(clientX: number): number {
      const caixa = barraCaixaRef.current;
      if (!caixa || !caixa.width) return currentTabRef.current;
      const larguraBotao = caixa.width / PAINEL_ROTAS.length;
      const posicao = (clientX - caixa.left) / larguraBotao - 0.5;
      return Math.max(0, Math.min(PAINEL_ROTAS.length - 1, posicao));
    }

    /**
     * O switch acabou de virar, então o iPhone acabou de dar o tique. Devolvê-lo
     * ao estado anterior deixa o mesmo arrasto disparar de novo quando o dedo
     * cruzar o próximo botão — é o que dá **um tique por aba**, e não um por
     * gesto. Fora do despacho do evento, para não reentrar no controle nativo.
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
        // Arrastar na barra alterna o switch nativo do botão sob o dedo, e o
        // navegador ainda manda um clique no fim. Sem engolir esse clique, o
        // arrasto terminaria abrindo a aba errada. Toque simples não marca a
        // flag, então continua passando.
        if (arrastouNaBarraRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

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
       * única que vibra: os botões têm switch nativo transparente por cima, e
       * desde o iOS 26.5 só a manipulação física de um controle desses aciona
       * a Taptic Engine (ver `src/lib/haptics.ts`). Arrastar ali é arrastar o
       * switch, e o tique vem do sistema, sem passar por JavaScript.
       *
       * Então o filtro de campos abaixo não vale para ela: os "inputs" da
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
        // Na barra não se previne nada: o gesto pertence ao switch nativo, e é
        // dele que vem o tique no iPhone. Cancelar o evento tiraria o controle
        // do sistema. A barra é fixa, então não há rolagem a impedir.
        if (e.cancelable && !barraNoGestoRef.current) e.preventDefault();
        hasSwipedRef.current = true;

        if (barraNoGestoRef.current) {
          /*
           * Arma o switch para a direção do gesto, uma vez só, no primeiro
           * movimento — que é quando a direção passa a ser conhecida.
           *
           * Switch desligado só sabe ligar, indo para a direita; para a
           * esquerda ele não muda de estado, e sem mudança de estado o iPhone
           * não dá o tique. Escrever `.checked` por código não dispara evento
           * algum, então isso não mexe na navegação.
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

          xPercent.set(-posicaoNaBarra(touch.clientX) * 20);
          return;
        }

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
      const arrastouNaBarra = arrastouNaBarraRef.current;
      barraNoGestoRef.current = false;
      soltarRearme();
      setTimeout(() => {
        hasSwipedRef.current = false;
        arrastouNaBarraRef.current = false;
      }, 150);

      /*
       * Arrasto na barra fecha pela posição do dedo, não pelo limiar de meia
       * tela que vale para o conteúdo — o gesto inteiro cabe nos 56px de
       * altura da barra.
       *
       * Este caminho também atende `touchcancel`: quando o switch nativo
       * assume o gesto, o WebKit cancela o toque em vez de encerrá-lo, e sem
       * tratar isso o conteúdo ficava parado no meio do caminho.
       */
      if (arrastouNaBarra) {
        navegarParaAba(Math.round(posicaoNaBarra(touch.clientX)), true);
        return;
      }

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
            propostas={negociacoesData.propostas as never}
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
