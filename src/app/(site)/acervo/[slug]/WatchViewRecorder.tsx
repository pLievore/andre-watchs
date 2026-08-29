"use client";

import { useEffect } from "react";
import { registrarVisualizacaoPeca } from "./actions";

export function WatchViewRecorder({ pecaId }: { pecaId: string }) {
  useEffect(() => {
    if (pecaId) {
      void registrarVisualizacaoPeca(pecaId);
    }
  }, [pecaId]);

  return null;
}