"use client";

/**
 * A posição do cliente na lista do acervo.
 *
 * Duas necessidades opostas moram aqui:
 *
 *  - **Entrar no acervo começa no topo.** Quem acabou de fazer login não pode
 *    cair no meio da grade — era para isso que este componente nasceu.
 *  - **Voltar de uma peça continua de onde parou.** Quem abriu o décimo
 *    relógio e voltou não deve recomeçar do primeiro. Sem isso, olhar dez
 *    peças significava rolar a mesma lista dez vezes.
 *
 * A distinção é feita por uma marca deixada pela página da peça
 * (`PecaVisitada`): se ela existe, a visita veio de dentro do acervo e a
 * posição é restaurada; se não, é chegada nova e a lista abre no topo.
 *
 * Guardado em `sessionStorage` de propósito: a posição vale para esta visita,
 * não para a próxima semana.
 */

import { useEffect, useLayoutEffect } from "react";
import { useLenis } from "lenis/react";

export const CHAVE_POSICAO = "acervo:posicao";
export const CHAVE_VOLTA = "acervo:volta";

export function AcervoScrollTop() {
  const lenis = useLenis();

  useLayoutEffect(() => {
    const irPara = (y: number) => {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      lenis?.scrollTo(y, { immediate: true });
    };

    let posicao = 0;

    try {
      const veioDaPeca = sessionStorage.getItem(CHAVE_VOLTA) === "1";
      sessionStorage.removeItem(CHAVE_VOLTA);

      if (veioDaPeca) {
        posicao = Number(sessionStorage.getItem(CHAVE_POSICAO) ?? 0) || 0;
      } else {
        sessionStorage.removeItem(CHAVE_POSICAO);
      }
    } catch {
      // Navegador com armazenamento bloqueado: cai no topo, que é o padrão.
    }

    irPara(posicao);

    // A grade tem altura previsível (cada card reserva 4:5 antes da foto
    // chegar), mas o layout ainda assenta um quadro depois da montagem.
    if (posicao > 0) {
      requestAnimationFrame(() => irPara(posicao));
    }
  }, [lenis]);

  // Acompanha a rolagem para saber onde a pessoa estava quando saiu.
  useEffect(() => {
    let agendado = false;

    const guardar = () => {
      agendado = false;
      try {
        sessionStorage.setItem(CHAVE_POSICAO, String(Math.round(window.scrollY)));
      } catch {
        // Sem armazenamento não há o que guardar — a volta cai no topo.
      }
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(guardar);
    };

    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => {
      window.removeEventListener("scroll", aoRolar);
      guardar();
    };
  }, []);

  return null;
}
