/**
 * Aviso de que o dono está vendo a vitrine, não o painel.
 *
 * Sem isto, o Andre abre `/acervo`, vê o acervo funcionando e não tem como
 * saber se está olhando o que o cliente vê ou uma versão privilegiada — e a
 * diferença importa, porque a leitura dele passa pela chave secret e mostraria
 * até peça que o RLS esconderia.
 *
 * Fica no topo, fixo, e some no papel do print: é ferramenta, não conteúdo.
 */

import Link from "next/link";

export function BarraPrevia() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-center print:hidden"
      style={{
        background: "var(--estado-alerta)",
        color: "#12100e",
      }}
    >
      <span style={{ fontSize: "0.8rem" }}>
        Você está vendo o acervo como a casa, não como cliente.
      </span>
      <Link
        href="/painel"
        className="underline underline-offset-4"
        style={{ fontSize: "0.8rem", color: "inherit" }}
      >
        Voltar ao painel
      </Link>
    </div>
  );
}
