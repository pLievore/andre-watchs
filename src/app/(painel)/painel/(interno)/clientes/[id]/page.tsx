import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";

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

  const { data: linha } = await dbAdmin
    .from("clientes")
    .select("id, nome, email, telefone, status, observacao, criado_em, ultimo_acesso")
    .eq("id", id)
    .maybeSingle();

  if (!linha) notFound();
  const cliente = linha as Cliente;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Link href="/painel/clientes" className="meta link-quiet">
          ← Clientes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
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
            <p className="meta">
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
          Cliente cadastrado. A senha inicial é o telefone dele, só os números —
          combine a troca no primeiro acesso.
        </p>
      )}

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
