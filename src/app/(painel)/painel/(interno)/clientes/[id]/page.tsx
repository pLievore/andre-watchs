import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { formatPrice } from "@/lib/format";

import { SeletorStatus } from "../SeletorStatus";
import type { Status } from "../status";
import { DadosForm, EmailForm, SenhaForm } from "./ClienteForms";
import { ExcluirCliente } from "./ExcluirCliente";

export const metadata: Metadata = { title: "Cliente" };

interface Cliente {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: Status;
  observacao: string | null;
  criado_em: string;
  ultimo_acesso: string | null;
}

function quando(iso: string | null): string {
  if (!iso) return "nunca entrou";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias === 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return "há mais de um mês";
  return `há ${Math.floor(dias / 30)} meses`;
}

function data(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function horaEData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function Secao({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="flex flex-col gap-5 border-t pt-8"
      style={{ borderColor: "var(--color-border)" }}
    >
      <div className="flex flex-col gap-1">
        <h2 className="label">{titulo}</h2>
        {nota && <p className="meta max-w-prose">{nota}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function ClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  const { id } = await params;
  const { novo } = await searchParams;

  const [{ data: linha }, { data: interessesRaw }, { data: pecasVistasRaw }] =
    await Promise.all([
      dbAdmin
        .from("clientes")
        .select("id, nome, email, telefone, status, observacao, criado_em, ultimo_acesso")
        .eq("id", id)
        .maybeSingle(),
      dbAdmin
        .from("interesses")
        .select("id, status, observacao, atualizado_em, pecas ( id, slug, marca, modelo, preco_centavos )")
        .eq("cliente_id", id)
        .order("atualizado_em", { ascending: false }),
      dbAdmin
        .from("eventos")
        .select("peca_id, criado_em, pecas ( slug, marca, modelo )")
        .eq("cliente_id", id)
        .eq("tipo", "viu_peca")
        .order("criado_em", { ascending: false })
        .limit(20),
    ]);

  if (!linha) notFound();
  const cliente = linha as Cliente;
  // Sem `as any`: as consultas vêm tipadas pelos tipos gerados do banco.
  const interesses = interessesRaw ?? [];
  const pecasVistas = pecasVistasRaw ?? [];

  // Agrupa quantas vezes cada peça foi vista por este cliente
  const mapaVistas = new Map<string, { nome: string; slug: string; count: number; ultimoVisto: string }>();
  pecasVistas.forEach((p) => {
    if (!p.peca_id || !p.pecas) return;
    const atual = mapaVistas.get(p.peca_id) || {
      nome: `${p.pecas.marca} ${p.pecas.modelo}`,
      slug: p.pecas.slug,
      count: 0,
      ultimoVisto: p.criado_em,
    };
    atual.count += 1;
    mapaVistas.set(p.peca_id, atual);
  });
  const rankingVistas = Array.from(mapaVistas.values());

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link
          href="/painel"
          className="link-quiet inline-flex items-center gap-1.5 py-1 text-xs"
          style={{ color: "var(--color-muted)" }}
        >
          <span aria-hidden>←</span>
          <span>Voltar para Clientes</span>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {cliente.nome}
            </h1>
            <p className="meta text-xs">
              Cliente desde {data(cliente.criado_em)} · último acesso{" "}
              {quando(cliente.ultimo_acesso)}
            </p>
          </div>

          <SeletorStatus id={cliente.id} status={cliente.status} />
        </div>
      </div>

      {novo && (
        <p
          className="border px-5 py-4 text-sm"
          style={{
            borderColor: "var(--estado-ok)",
            color: "var(--color-foreground)",
          }}
        >
          Cliente cadastrado com sucesso. O acesso à vitrine reservada está liberado.
        </p>
      )}

      {/* ── Inteligência & Interesses ─────────────────────────────────── */}
      <Secao
        titulo="Interesse & Prospecção"
        nota="Peças que este cliente olhou no acervo e contatos no WhatsApp."
      >
        {interesses.length === 0 && rankingVistas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            Nenhuma atividade registrada ainda para este cliente.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {interesses.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="label text-xs">Conversas no WhatsApp:</span>
                <ul className="divide-y border-y" style={{ borderColor: "var(--color-border)" }}>
                  {interesses.map((item) => (
                    <li key={item.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                      <div>
                        {item.pecas ? (
                          <Link
                            href={`/painel/pecas/${item.pecas.slug}`}
                            className="link-quiet font-medium"
                            style={{ color: "var(--color-accent)" }}
                          >
                            {item.pecas.marca} {item.pecas.modelo}
                          </Link>
                        ) : (
                          <span>Peça</span>
                        )}
                        <span className="meta ml-2">
                          {item.pecas ? formatPrice(item.pecas.preco_centavos) : ""} · {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="meta text-xs">{horaEData(item.atualizado_em)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rankingVistas.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="label text-xs">Peças mais visualizadas pelo cliente:</span>
                <ul className="divide-y border-y" style={{ borderColor: "var(--color-border)" }}>
                  {rankingVistas.map((item) => (
                    <li key={item.slug} className="py-2.5 flex items-center justify-between text-sm">
                      <Link
                        href={`/painel/pecas/${item.slug}`}
                        className="link-quiet"
                        style={{ color: "var(--color-foreground)" }}
                      >
                        {item.nome}
                      </Link>
                      <span className="meta text-xs">
                        abriu {item.count} {item.count === 1 ? "vez" : "vezes"} · última {quando(item.ultimoVisto)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Secao>

      <Secao titulo="Cadastro">
        <DadosForm
          id={cliente.id}
          nome={cliente.nome}
          telefone={cliente.telefone}
          observacao={cliente.observacao}
        />
      </Secao>

      <Secao
        titulo="Acesso"
        nota="O e-mail é a credencial de login, não um dado de contato — trocar aqui muda como ele entra."
      >
        <EmailForm id={cliente.id} email={cliente.email} />
      </Secao>

      <Secao
        titulo="Senha"
        nota="Use quando ele avisar que não consegue entrar. A sessão aberta dele não cai na hora, mas o login seguinte já pede a nova."
      >
        <SenhaForm id={cliente.id} />
      </Secao>

      <Secao
        titulo="Excluir"
        nota="Apaga o cadastro e o login, sem volta. Para tirar o acesso de quem parou de comprar, prefira “Sem acesso” — preserva o histórico e permite voltar atrás."
      >
        <ExcluirCliente id={cliente.id} nome={cliente.nome} />
      </Secao>
    </div>
  );
}