"use client";

import { useActionState, useState } from "react";

import {
  gerarNovoConvite,
  revogarConvite,
  type ConviteItem,
  type EstadoConvite,
} from "./convites-actions";

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function GeradorConvite({ convites }: { convites: ConviteItem[] }) {
  const [estado, acao, pendente] = useActionState<EstadoConvite, FormData>(
    gerarNovoConvite,
    {},
  );
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [copiadoWhats, setCopiadoWhats] = useState(false);
  const [revogandoId, setRevogandoId] = useState<string | null>(null);

  async function copiar(texto: string, tipo: "link" | "whats") {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === "link") {
        setCopiadoLink(true);
        setTimeout(() => setCopiadoLink(false), 2500);
      } else {
        setCopiadoWhats(true);
        setTimeout(() => setCopiadoWhats(false), 2500);
      }
    } catch {
      // Fallback silencioso
    }
  }

  async function handleRevogar(id: string) {
    if (!confirm("Tem certeza que deseja revogar este convite?")) return;
    setRevogandoId(id);
    try {
      await revogarConvite(id);
    } finally {
      setRevogandoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        action={acao}
        className="border p-5 sm:p-6 flex flex-col gap-4"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h3
            className="label text-sm uppercase tracking-wider"
            style={{ color: "var(--color-foreground)" }}
          >
            Gerar convite exclusivo
          </h3>
          <p className="meta">
            Gera um link pessoal de uso único válido por 7 dias para enviar no
            WhatsApp.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <label className="flex flex-col gap-1.5 flex-1 w-full" htmlFor="nome-convidado">
            <span className="label">Nome do convidado (opcional)</span>
            <input
              id="nome-convidado"
              name="nome"
              placeholder="Ex.: Paulo Silveira"
              className="campo"
              disabled={pendente}
            />
          </label>
          <button
            type="submit"
            disabled={pendente}
            className="btn btn-primary whitespace-nowrap w-full sm:w-auto"
            style={{ minHeight: 44 }}
          >
            {pendente ? "Gerando link…" : "Gerar link de 7 dias"}
          </button>
        </div>

        {estado.erro && (
          <p className="text-xs" style={{ color: "var(--estado-erro)" }}>
            {estado.erro}
          </p>
        )}

        {estado.sucesso && estado.url && (
          <div
            className="mt-3 border p-4 flex flex-col gap-3"
            style={{
              borderColor: "var(--color-foreground)",
              background: "var(--color-background)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="selo selo-ok">Convite pronto</span>
              <span className="meta">Expira em 7 dias · Uso único</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                value={estado.url}
                className="campo text-xs select-all flex-1"
                style={{ background: "var(--color-surface)" }}
              />
              <button
                type="button"
                onClick={() => copiar(estado.url!, "link")}
                className="btn btn-ghost text-xs whitespace-nowrap"
                style={{ minHeight: 44 }}
              >
                {copiadoLink ? "Link copiado! ✓" : "Copiar link"}
              </button>
            </div>

            {estado.mensagemWhatsapp && (
              <div className="pt-2 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="meta text-xs">
                  Texto pronto no tom da casa para o WhatsApp:
                </p>
                <button
                  type="button"
                  onClick={() => copiar(estado.mensagemWhatsapp!, "whats")}
                  className="label border px-3 py-2 text-xs"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-foreground)",
                    minHeight: 38,
                  }}
                >
                  {copiadoWhats ? "Mensagem copiada! ✓" : "Copiar mensagem para WhatsApp"}
                </button>
              </div>
            )}
          </div>
        )}
      </form>

      {convites.length > 0 && (
        <details className="border-t pt-4" style={{ borderColor: "var(--color-border)" }}>
          <summary className="meta cursor-pointer py-1 select-none flex items-center justify-between">
            <span>Histórico de convites ({convites.length})</span>
            <span className="text-xs">▾</span>
          </summary>

          <ul className="mt-3 flex flex-col divide-y border-y" style={{ borderColor: "var(--color-border)" }}>
            {convites.map((c) => {
              const selo =
                c.status === "ativo"
                  ? "selo-ok"
                  : c.status === "usado"
                    ? ""
                    : "selo-erro";
              const rotuloStatus =
                c.status === "ativo"
                  ? "Válido"
                  : c.status === "usado"
                    ? "Resgatado"
                    : "Expirado";

              return (
                <li
                  key={c.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-medium text-sm truncate" style={{ color: "var(--color-foreground)" }}>
                      {c.nomeSugerido || "Sem nome informado"}
                    </span>
                    <span className="meta truncate">
                      Gerado em {formatarData(c.criadoEm)} · expira em {formatarData(c.expiraEm)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`selo ${selo}`}>{rotuloStatus}</span>
                    {c.status === "ativo" && (
                      <button
                        type="button"
                        onClick={() => handleRevogar(c.id)}
                        disabled={revogandoId === c.id}
                        className="meta link-quiet text-xs hover:text-[var(--estado-erro)]"
                        style={{ color: "var(--color-muted)" }}
                      >
                        {revogandoId === c.id ? "Revogando…" : "Revogar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}