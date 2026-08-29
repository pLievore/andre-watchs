import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

import { BotaoExcluir } from "./BotaoExcluir";
import { GerenciadorFotos, type FotoPainel } from "./GerenciadorFotos";
import { PecaForm, type PecaEditavel } from "./PecaForm";

export const metadata: Metadata = { title: "Editar peça" };

/** Uma hora — o suficiente para a sessão de edição, sem virar link eterno. */
const VALIDADE_PREVIA = 3600;

export default async function EditarPecaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ nova?: string; fotos?: string }>;
}) {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  const { slug } = await params;
  const { nova, fotos: fotosEnviadas } = await searchParams;

  // Lê pela chave secret: o RLS só libera leitura para cliente ativo, e o
  // admin não é cliente. Ver docs/BANCO.md.
  const { data: peca } = await dbAdmin
    .from("pecas")
    .select(
      "id, slug, marca, modelo, condicao, integralidade, referencia, calibre, diametro_mm, material_caixa, pulseira, mostrador, ano_cartao, preco_centavos, estado, consignada, historia, notas_estado",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!peca) notFound();

  const [
    { data: linhas },
    { data: interessesRaw },
    { data: visualizacoesRaw },
  ] = await Promise.all([
    dbAdmin
      .from("fotos")
      .select("id, url, alt, ordem")
      .eq("peca_id", peca.id)
      .order("ordem", { ascending: true }),
    dbAdmin
      .from("interesses")
      .select("id, status, observacao, atualizado_em, clientes ( id, nome, email, telefone )")
      .eq("peca_id", peca.id)
      .order("atualizado_em", { ascending: false }),
    dbAdmin
      .from("eventos")
      .select("id, criado_em, clientes ( id, nome, email )")
      .eq("peca_id", peca.id)
      .eq("tipo", "viu_peca")
      .order("criado_em", { ascending: false })
      .limit(15),
  ]);

  const fotos = await comPrevia((linhas ?? []) as FotoPainel[]);
  const interesses = (interessesRaw ?? []) as any[];
  const visualizacoes = (visualizacoesRaw ?? []) as any[];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link href="/painel/pecas" className="meta link-quiet">
          ← Peças
        </Link>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          {peca.marca} {peca.modelo}
        </h1>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href={`/acervo/${peca.slug}`} className="meta link-quiet">
            Ver como o cliente vê →
          </Link>
          <span className="meta">·</span>
          <Link
            href={`/acervo/${peca.slug}/dossie`}
            target="_blank"
            className="meta link-quiet font-medium"
            style={{ color: "var(--color-accent)" }}
          >
            📄 Gerar Dossiê Executivo (PDF) ↗
          </Link>
        </div>
      </div>

      {/*
        Confirmação de que a peça entrou. Sem isto, o cadastro joga numa tela
        de edição idêntica à de sempre e a pessoa fica sem saber se salvou.
      */}
      {nova && (
        <p
          className="border px-5 py-4 text-sm"
          style={{
            borderColor: "var(--estado-ok)",
            color: "var(--color-foreground)",
          }}
        >
          {fotosEnviadas
            ? `Peça cadastrada com ${fotosEnviadas} foto${fotosEnviadas === "1" ? "" : "s"}. Complete o que faltar de especificação.`
            : "Peça cadastrada. Agora adicione as fotos e complete o que faltar de especificação."}
        </p>
      )}

      <GerenciadorFotos slug={peca.slug} fotos={fotos} />

      {/* ── Inteligência da Peça ────────────────────────────────────────── */}
      <section
        className="border p-5 sm:p-6 flex flex-col gap-4"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="label">Inteligência & Prospecção</h2>
          <p className="meta">
            Interesse e movimentação desta peça entre os clientes autorizados da
            casa.
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-4 border-y py-4"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <span className="label text-xs">Visualizações no acervo</span>
            <p
              className="mt-1 text-2xl font-light font-mono"
              style={{ color: "var(--color-foreground)" }}
            >
              {visualizacoes.length}
            </p>
          </div>
          <div>
            <span className="label text-xs">Contatos no WhatsApp</span>
            <p
              className="mt-1 text-2xl font-light font-mono"
              style={{ color: "var(--color-accent)" }}
            >
              {interesses.length}
            </p>
          </div>
        </div>

        {interesses.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="label text-xs">Clientes interessados:</span>
            <ul
              className="divide-y border-t"
              style={{ borderColor: "var(--color-border)" }}
            >
              {interesses.map((item) => (
                <li
                  key={item.id}
                  className="py-2.5 flex items-center justify-between text-sm"
                >
                  {item.clientes ? (
                    <Link
                      href={`/painel/clientes/${item.clientes.id}`}
                      className="link-quiet font-medium"
                      style={{ color: "var(--color-foreground)" }}
                    >
                      {item.clientes.nome}
                    </Link>
                  ) : (
                    <span>Cliente</span>
                  )}
                  <span className="meta text-xs">
                    Status: {item.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div
        className="border-t pt-10"
        style={{ borderColor: "var(--color-border)" }}
      >
        <PecaForm peca={peca as unknown as PecaEditavel} />
      </div>

      {/*
        Excluir fica no fim, separado, e exige confirmação. É para desfazer
        cadastro errado — peça vendida vale mais listada do que apagada, porque
        é o registro do que passou pela casa.
      */}
      <div
        className="flex flex-col gap-3 border-t pt-8"
        style={{ borderColor: "var(--color-border)" }}
      >
        <h2 className="label">Excluir</h2>
        <p className="meta max-w-prose">
          Apaga a peça e as fotos, sem volta. Se ela foi vendida, prefira marcar
          como vendida — o acervo guarda o histórico da casa.
        </p>
        <BotaoExcluir
          slug={peca.slug}
          nome={`${peca.marca} ${peca.modelo}`}
        />
      </div>
    </div>
  );
}

/** Bucket privado: a prévia do painel também precisa de link assinado. */
async function comPrevia(fotos: FotoPainel[]): Promise<FotoPainel[]> {
  const caminhos = fotos
    .map((f) => f.url)
    // Legado em `/public` começa com `/`; só o caminho sem barra vive no bucket.
    .filter((u) => u && !/^https?:\/\//i.test(u) && !u.startsWith("/"));

  if (caminhos.length === 0) return fotos;

  const { data } = await dbAdmin.storage
    .from("pecas")
    .createSignedUrls(caminhos, VALIDADE_PREVIA);

  const mapa = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.signedUrl && item.path) mapa.set(item.path, item.signedUrl);
  }

  return fotos.map((f) =>
    mapa.has(f.url) ? { ...f, url: mapa.get(f.url)! } : f,
  );
}
