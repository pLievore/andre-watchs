"use client";

import { useEffect, useState } from "react";

export function ModalBoasVindas({
  nome,
  ativo,
}: {
  nome: string;
  ativo: boolean;
}) {
  const [visivel, setVisivel] = useState(ativo);

  useEffect(() => {
    if (ativo) {
      // Garante que o scroll vá imediatamente para o topo da página,
      // evitando que restaurações de scroll joguem o usuário direto nos produtos.
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [ativo]);

  if (!visivel) return null;

  function fechar() {
    setVisivel(false);
    try {
      window.history.replaceState({}, "", "/acervo");
    } catch {}
  }

  const primeiroNome = nome ? nome.trim().split(/\s+/)[0] : "Colecionador";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{
        background: "rgba(10, 9, 8, 0.88)",
        backdropFilter: "blur(12px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-boas-vindas"
    >
      <div
        className="relative w-full max-w-lg border p-6 sm:p-8 text-center"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
          boxShadow: "0 30px 80px rgba(0, 0, 0, 0.85)",
        }}
      >
        {/* Selo editorial de boas-vindas */}
        <div className="flex justify-center mb-4">
          <span
            className="inline-block border px-3 py-1 text-[11px] font-mono tracking-widest uppercase"
            style={{
              borderColor: "var(--color-accent)",
              color: "var(--color-accent)",
              background: "rgba(197, 160, 89, 0.08)",
            }}
          >
            Acesso Exclusivo Liberado
          </span>
        </div>

        <h2
          id="titulo-boas-vindas"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "var(--color-foreground)",
          }}
        >
          Seja bem-vindo, {primeiroNome}.
        </h2>

        <p
          className="mt-3 text-sm sm:text-base leading-relaxed"
          style={{ color: "var(--color-muted)" }}
        >
          Seu acesso foi ativado com sucesso. Você agora tem acesso irrestrito ao acervo
          reservado da casa, com todas as peças originais, cotações e negociação direta.
        </p>

        {/* Pilares do Acervo */}
        <div
          className="mt-6 border-t border-b py-4 flex flex-col gap-3 text-left text-xs"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="flex items-start gap-2.5">
            <span style={{ color: "var(--color-accent)" }}>✦</span>
            <p style={{ color: "var(--color-foreground)" }}>
              <strong>Peças Autênticas:</strong> Procedência atestada na bancada e estado de conservação rigorosamente documentado.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span style={{ color: "var(--color-accent)" }}>✦</span>
            <p style={{ color: "var(--color-foreground)" }}>
              <strong>Dossiê & Macrofotografia:</strong> Inspecione mostradores e detalhes em alta resolução técnica.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span style={{ color: "var(--color-accent)" }}>✦</span>
            <p style={{ color: "var(--color-foreground)" }}>
              <strong>Encomendas VIP:</strong> Se busca uma referência específica que não esteja no catálogo, localizamos para você.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fechar}
          className="btn btn-primary mt-6 w-full justify-center text-sm py-3 cursor-pointer"
        >
          Explorar o Acervo da Casa
        </button>
      </div>
    </div>
  );
}