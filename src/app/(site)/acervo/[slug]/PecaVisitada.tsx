"use client";

/**
 * Marca que esta visita veio de dentro do acervo.
 *
 * A lista lê essa marca para decidir entre restaurar a posição de rolagem e
 * abrir no topo (ver `AcervoScrollTop`). Sem ela, entrar no clube e voltar de
 * uma peça seriam indistinguíveis, e um dos dois comportamentos ficaria errado.
 */

import { useEffect } from "react";

import { CHAVE_VOLTA } from "../AcervoScrollTop";

export function PecaVisitada() {
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE_VOLTA, "1");
    } catch {
      // Sem armazenamento a lista simplesmente abre no topo.
    }
  }, []);

  return null;
}
