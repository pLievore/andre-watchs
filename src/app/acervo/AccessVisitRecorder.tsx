"use client";

import { useEffect } from "react";

import { registrarVisitaAoAcervo } from "./actions";

/**
 * Efeito sem interface: dispara depois da hidratação, quando a saudação já foi
 * renderizada com o `ultimo_acesso` anterior. Falhar aqui nunca esconde o
 * acervo nem interrompe a navegação do cliente.
 */
export function AccessVisitRecorder() {
  useEffect(() => {
    void registrarVisitaAoAcervo();
  }, []);

  return null;
}
