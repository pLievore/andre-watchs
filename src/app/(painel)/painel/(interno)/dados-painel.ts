import { redirect } from "next/navigation";
import { dbAdmin } from "@/lib/db/admin";
import { usuarioAdmin } from "@/lib/db/admin-auth";
import { listarConvites } from "./clientes/convites-actions";

export async function carregarDadosPainel() {
  const admin = await usuarioAdmin();
  if (!admin) redirect("/painel/entrar");

  const agora = new Date();
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Executa todas as consultas em paralelo para manter o carregamento inicial < 60ms
  const [
    { data: clientesRaw },
    { data: pendentesRaw },
    { data: recusadasRaw },
    convites,
    { data: eventosRaw },
    { data: interessesRaw },
    { count: totalClientes },
    { data: pecasAtivasRaw },
    { count: totalAcessos },
    { count: totalViuPeca },
    { count: totalWhatsApp },
    { data: propostasRaw },
    { data: pecasRaw },
  ] = await Promise.all([
    // 1. Clientes
    dbAdmin
      .from("clientes")
      .select("id, nome, email, telefone, status, criado_em, ultimo_acesso")
      .order("status", { ascending: true })
      .order("ultimo_acesso", { ascending: false, nullsFirst: false }),

    // 2. Solicitações de acesso pendentes
    dbAdmin
      .from("solicitacoes_acesso")
      .select("id, nome, email, telefone, observacao, criado_em")
      .is("resolvido_em", null)
      .order("criado_em", { ascending: true }),

    // 3. Solicitações recusadas
    dbAdmin
      .from("solicitacoes_acesso")
      .select("id, nome, email, resolvido_em")
      .not("resolvido_em", "is", null)
      .order("resolvido_em", { ascending: false })
      .limit(20),

    // 4. Convites emitidos
    listarConvites(),

    // 5. Eventos dos últimos 30 dias (Dashboard)
    dbAdmin
      .from("eventos")
      .select(`
        id, tipo, criado_em, cliente_id, peca_id, cidade, dispositivo,
        clientes ( id, nome, telefone ),
        pecas ( id, slug, marca, modelo, preco_centavos )
      `)
      .gte("criado_em", trintaDiasAtras)
      .order("criado_em", { ascending: true }),

    // 6. Interesses completos com clientes e peças (Dashboard + Negociações)
    dbAdmin
      .from("interesses")
      .select(`
        id, status, observacao, criado_em, atualizado_em,
        clientes ( id, nome, email, telefone ),
        pecas ( id, slug, marca, modelo, preco_centavos, estado, fotos ( url, ordem ) )
      `)
      .order("atualizado_em", { ascending: false }),

    // 7. Contagem total de clientes
    dbAdmin.from("clientes").select("id", { count: "exact", head: true }),

    /*
     * 8. Peças ainda na casa, para o valor em estoque.
     *
     * Isto filtrava por `publicado`, coluna que **não existe** na tabela: a
     * consulta voltava erro e o estoque aparecia zerado no painel. O bug só
     * ficou visível quando os tipos do banco entraram (fase 15). O critério
     * certo é o estado comercial — vendida saiu do estoque, disponível e em
     * negociação continuam sendo patrimônio da casa.
     */
    dbAdmin
      .from("pecas")
      .select("id, preco_centavos")
      .neq("estado", "vendida"),

    // 9. Métricas de funil
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

    // 10. Propostas de venda vindas da vitrine (Negociações)
    dbAdmin
      .from("propostas")
      .select(
        "id, nome, contato, intencao, marca, modelo, referencia, ano, integralidade, observacao, status, criado_em",
      )
      .order("criado_em", { ascending: false })
      .limit(50),

    // 11. Catálogo completo de peças (Peças)
    dbAdmin
      .from("pecas")
      .select(
        "slug, marca, modelo, referencia, preco_centavos, estado, consignada, fotos(count)",
      )
      .order("estado", { ascending: true })
      .order("criado_em", { ascending: false }),
  ]);

  return {
    admin: { email: admin.email ?? "" },
    clientesData: {
      clientes: clientesRaw ?? [],
      pendentes: pendentesRaw ?? [],
      recusadas: recusadasRaw ?? [],
      convites: convites ?? [],
    },
    dashboardData: {
      eventosRaw: eventosRaw ?? [],
      interessesRaw: interessesRaw ?? [],
      totalClientes: totalClientes ?? 0,
      pecasAtivasRaw: pecasAtivasRaw ?? [],
    },
    negociacoesData: {
      totalAcessos: totalAcessos ?? 0,
      totalViuPeca: totalViuPeca ?? 0,
      totalWhatsApp: totalWhatsApp ?? 0,
      interessesRaw: interessesRaw ?? [],
      propostas: propostasRaw ?? [],
    },
    pecasData: {
      pecas: pecasRaw ?? [],
    },
  };
}

export type DadosPainel = Awaited<ReturnType<typeof carregarDadosPainel>>;
