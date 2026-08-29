import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { formatPrice } from "@/lib/format";
import { SeletorStatusInteresse } from "./SeletorStatusInteresse";
import type { StatusInteresse } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Negociações & Funil" };

function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

interface LinhaInteresse {
  id: string;
  status: StatusInteresse;
  observacao: string | null;
  criado_em: string;
  atualizado_em: string;
  clientes: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  } | null;
  pecas: {
    id: string;
    slug: string;
    marca: string;
    modelo: string;
    preco_centavos: number;
    estado: string;
    fotos: { url: string; ordem: number }[] | null;
  } | null;
}

export default async function PainelNegociacoesPage() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  const agora = new Date();
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Contagens de eventos dos últimos 30 dias
  const [
    { count: totalAcessos },
    { count: totalViuPeca },
    { count: totalWhatsApp },
    { data: interessesRaw },
    { data: eventosPecas },
  ] = await Promise.all([
    dbAdmin
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "acesso")
      .gte("criado_em", trintaDiasAtras),
    dbAdmin
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "viu_peca")
      .gte("criado_em", trintaDiasAtras),
    dbAdmin
      .from("eventos")
      .select("id", { count: "exact", head: true })
      .eq("tipo", "foi_whatsapp")
      .gte("criado_em", trintaDiasAtras),
    dbAdmin
      .from("interesses")
      .select(`
        id, status, observacao, criado_em, atualizado_em,
        clientes ( id, nome, email, telefone ),
        pecas ( id, slug, marca, modelo, preco_centavos, estado, fotos ( url, ordem ) )
      `)
      .order("atualizado_em", { ascending: false }),
    dbAdmin
      .from("eventos")
      .select("peca_id, tipo, pecas ( slug, marca, modelo )")
      .not("peca_id", "is", null)
      .gte("criado_em", trintaDiasAtras),
  ]);

  const interesses = (interessesRaw ?? []) as unknown as LinhaInteresse[];

  // Agrupa ranking das peças nos últimos 30 dias
  const mapaPecas = new Map<
    string,
    { slug: string; nome: string; views: number; whatsapps: number }
  >();

  (eventosPecas ?? []).forEach((ev: any) => {
    if (!ev.peca_id || !ev.pecas) return;
    const atual = mapaPecas.get(ev.peca_id) || {
      slug: ev.pecas.slug,
      nome: `${ev.pecas.marca} ${ev.pecas.modelo}`,
      views: 0,
      whatsapps: 0,
    };
    if (ev.tipo === "viu_peca") atual.views += 1;
    if (ev.tipo === "foi_whatsapp") atual.whatsapps += 1;
    mapaPecas.set(ev.peca_id, atual);
  });

  const rankingPecas = Array.from(mapaPecas.values())
    .sort((a, b) => b.whatsapps * 3 + b.views - (a.whatsapps * 3 + a.views))
    .slice(0, 5);

  const taxaConversao = totalAcessos
    ? (((totalWhatsApp ?? 0) / totalAcessos) * 100).toFixed(1)
    : "0";

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Negociações & Funil
        </h1>
        <p className="meta">
          Inteligência de prospecção e pipeline dos contatos realizados no WhatsApp.
        </p>
      </header>

      {/* ── Cards do Funil (30 dias) ────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Métricas do funil">
        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Acessos ao acervo</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-foreground)" }}>
            {totalAcessos ?? 0}
          </span>
          <span className="meta mt-1">últimos 30 dias</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Peças visualizadas</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-foreground)" }}>
            {totalViuPeca ?? 0}
          </span>
          <span className="meta mt-1">exibições de fichas</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-accent)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Idas ao WhatsApp</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--color-accent)" }}>
            {totalWhatsApp ?? 0}
          </span>
          <span className="meta mt-1">cliques em interesse</span>
        </div>

        <div
          className="border p-5 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-xs">Taxa de conversão</span>
          <span className="mt-3 text-3xl font-light font-mono" style={{ color: "var(--estado-ok)" }}>
            {taxaConversao}%
          </span>
          <span className="meta mt-1">WhatsApp / Acessos</span>
        </div>
      </section>

      {/* ── Peças mais desejadas ────────────────────────────────────────── */}
      {rankingPecas.length > 0 && (
        <section
          className="border p-5 sm:p-6 flex flex-col gap-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
        >
          <div>
            <h2 className="label">Peças mais procuradas (30 dias)</h2>
            <p className="meta mt-0.5">Ranking por intenções de compra e visualizações no acervo.</p>
          </div>

          <ul className="divide-y border-t" style={{ borderColor: "var(--color-border)" }}>
            {rankingPecas.map((p, idx) => (
              <li key={p.slug} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="meta font-mono font-medium text-sm">#{idx + 1}</span>
                  <Link
                    href={`/painel/pecas/${p.slug}`}
                    className="link-quiet truncate text-sm font-medium"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    {p.nome}
                  </Link>
                </div>
                <div className="flex items-center gap-4 text-xs meta shrink-0">
                  <span>{p.views} visualizaç{p.views === 1 ? "ão" : "ões"}</span>
                  <span
                    className="font-medium"
                    style={{ color: p.whatsapps > 0 ? "var(--color-accent)" : "var(--color-muted)" }}
                  >
                    {p.whatsapps} contato{p.whatsapps === 1 ? "" : "s"} no WhatsApp
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Pipeline de Negociações ────────────────────────────────────── */}
      <section className="flex flex-col gap-6" aria-labelledby="pipeline-title">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 id="pipeline-title" className="label">
              Pipeline de Negociações ({interesses.length})
            </h2>
            <p className="meta mt-0.5">
              Clientes que clicaram no WhatsApp para negociar uma peça do acervo.
            </p>
          </div>
        </div>

        {interesses.length === 0 ? (
          <div
            className="border p-12 text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p style={{ color: "var(--color-foreground)" }}>Nenhuma negociação aberta ainda.</p>
            <p className="meta mt-2 max-w-md mx-auto">
              Quando um cliente ativo visualizar uma peça no acervo e clicar para falar no WhatsApp, a negociação entra aqui automaticamente.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y border-y" style={{ borderColor: "var(--color-border)" }}>
            {interesses.map((item) => {
              const cliente = item.clientes;
              const peca = item.pecas;

              return (
                <li
                  key={item.id}
                  className="py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  {/* Dados do cliente e peça */}
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cliente ? (
                        <Link
                          href={`/painel/clientes/${cliente.id}`}
                          className="link-quiet font-medium text-base"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {cliente.nome}
                        </Link>
                      ) : (
                        <span className="text-sm">Cliente removido</span>
                      )}
                      {cliente?.telefone && (
                        <span className="meta">· {cliente.telefone}</span>
                      )}
                      {cliente?.email && (
                        <span className="meta truncate">· {cliente.email}</span>
                      )}
                    </div>

                    {peca ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="label text-xs">Peça:</span>
                        <Link
                          href={`/painel/pecas/${peca.slug}`}
                          className="link-quiet font-medium"
                          style={{ color: "var(--color-accent)" }}
                        >
                          {peca.marca} {peca.modelo}
                        </Link>
                        <span className="meta">({formatPrice(peca.preco_centavos)})</span>
                      </div>
                    ) : (
                      <span className="meta">Peça descontinuada</span>
                    )}

                    <span className="meta text-xs">
                      Atualizado em {formatarData(item.atualizado_em)}
                    </span>
                  </div>

                  {/* Seletor rápido de status do pipeline */}
                  <div className="flex items-center gap-3 shrink-0">
                    <SeletorStatusInteresse id={item.id} statusAtual={item.status} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}