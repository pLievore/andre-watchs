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

  const { data: linhas } = await dbAdmin
    .from("fotos")
    .select("id, url, alt, ordem")
    .eq("peca_id", peca.id)
    .order("ordem", { ascending: true });

  const fotos = await comPrevia((linhas ?? []) as FotoPainel[]);

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
        <Link href={`/acervo/${peca.slug}`} className="meta link-quiet">
          Ver como o cliente vê →
        </Link>
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
    .filter((u) => u && !/^https?:\/\//i.test(u));

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
