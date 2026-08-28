/**
 * Vocabulário dos status de cliente.
 *
 * Módulo sem `"use client"` de propósito: a lista é Server Component e precisa
 * do rótulo e da cor para desenhar o selo, enquanto o seletor é client. Se
 * estas funções morassem no arquivo do seletor, o servidor não poderia
 * chamá-las — foi exatamente o erro que derrubou `/painel/clientes`.
 */

export type Status = "ativo" | "pendente" | "recusado" | "inativo";

export const OPCOES_STATUS: readonly {
  valor: Status;
  rotulo: string;
  nota: string;
}[] = [
  { valor: "ativo", rotulo: "Com acesso", nota: "entra e vê o acervo" },
  { valor: "pendente", rotulo: "Em análise", nota: "ainda não decidido" },
  { valor: "inativo", rotulo: "Sem acesso", nota: "era cliente, não entra mais" },
  { valor: "recusado", rotulo: "Recusado", nota: "a casa não aceitou" },
];

export function corDoStatus(s: Status): string {
  return s === "ativo"
    ? "var(--estado-ok)"
    : s === "pendente"
      ? "var(--estado-alerta)"
      : s === "recusado"
        ? "var(--estado-erro)"
        : "var(--color-muted)";
}

export function rotuloDoStatus(s: Status): string {
  return OPCOES_STATUS.find((o) => o.valor === s)?.rotulo ?? s;
}
