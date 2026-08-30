"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { GraficoTendencia } from "../dashboard/GraficoTendencia";
import type { DadosPainel } from "../dados-painel";

/**
 * Os dados chegam com a forma do banco (tipos gerados em
 * `src/lib/db/tipos-banco.ts`), derivada do carregador do painel. Foi assim
 * que apareceu o filtro por uma coluna `publicado` que não existe — o `any`
 * escondia isso desde a primeira versão do painel.
 */
type DadosDashboard = DadosPainel["dashboardData"];

interface DashboardViewProps {
  eventosRaw: DadosDashboard["eventosRaw"];
  interessesRaw: DadosDashboard["interessesRaw"];
  totalClientes: number;
  pecasAtivasRaw: DadosDashboard["pecasAtivasRaw"];
}

export function DashboardView({
  eventosRaw,
  interessesRaw,
  totalClientes,
  pecasAtivasRaw,
}: DashboardViewProps) {
  const agora = new Date();
  const eventos = eventosRaw ?? [];
  const interesses = interessesRaw ?? [];
  const pecasAtivas = pecasAtivasRaw ?? [];

  // 1. Totais do período
  const totalAcessos = eventos.filter((e) => e.tipo === "acesso").length;
  const totalViuPeca = eventos.filter((e) => e.tipo === "viu_peca").length;
  const totalWhatsApp = eventos.filter((e) => e.tipo === "foi_whatsapp").length;

  const negociacoesAtivas = interesses.filter(
    (i) => i.status === "em_conversa" || i.status === "negociando"
  );
  const vendasFechadas = interesses.filter((i) => i.status === "vendido");

  const volumePipelineCentavos = negociacoesAtivas.reduce(
    (acc, i) => acc + (i.pecas?.preco_centavos ?? 0),
    0
  );
  const estoqueTotalCentavos = pecasAtivas.reduce(
    (acc, p) => acc + (p.preco_centavos ?? 0),
    0
  );

  // 2. Agrupamento diário dos últimos 14 dias (Série Temporal)
  const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const diasSérie: {
    dataIso: string;
    rotulo: string;
    diaSemana: string;
    acessos: number;
    visualizacoes: number;
    whatsapps: number;
  }[] = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(agora.getTime() - i * 24 * 60 * 60 * 1000);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const dataIso = `${ano}-${mes}-${dia}`;
    const rotulo = `${dia}/${mes}`;
    const diaSemana = DIAS_SEMANA[d.getDay()] ?? "Seg";

    diasSérie.push({
      dataIso,
      rotulo,
      diaSemana,
      acessos: 0,
      visualizacoes: 0,
      whatsapps: 0,
    });
  }

  eventos.forEach((ev) => {
    const dataEv = ev.criado_em ? ev.criado_em.substring(0, 10) : "";
    const diaMatch = diasSérie.find((d) => d.dataIso === dataEv);
    if (diaMatch) {
      if (ev.tipo === "acesso") diaMatch.acessos += 1;
      if (ev.tipo === "viu_peca") diaMatch.visualizacoes += 1;
      if (ev.tipo === "foi_whatsapp") diaMatch.whatsapps += 1;
    }
  });

  // 3. Distribuição por cidade — só o que foi realmente identificado.
  // Evento sem cidade NÃO vira palpite: ele é contado à parte e aparece
  // como "sem origem" na tela. Um padrão aqui seria dado inventado
  // apresentado como medição (regra do CLAUDE.md).
  const contagemCidades: Record<string, number> = {};
  let semOrigem = 0;
  eventos.forEach((ev) => {
    const cidade = ev.cidade;
    if (!cidade) {
      semOrigem += 1;
      return;
    }
    contagemCidades[cidade] = (contagemCidades[cidade] || 0) + 1;
  });

  const totalComCidade = eventos.length - semOrigem;
  const rankingCidades = Object.entries(contagemCidades)
    .map(([cidade, total]) => ({
      cidade,
      total,
      pct: Math.round((total / (totalComCidade || 1)) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  // 4. Distribuição por Dispositivo
  let countMobile = 0;
  let countDesktop = 0;
  // Registro antigo, sem dispositivo gravado, fica fora da conta em vez de
  // engordar "desktop" por omissão.
  eventos.forEach((ev) => {
    if (ev.dispositivo === "mobile") countMobile++;
    else if (ev.dispositivo === "desktop") countDesktop++;
  });
  const totalDisp = countMobile + countDesktop || 1;
  const pctMobile = Math.round((countMobile / totalDisp) * 100);
  const pctDesktop = 100 - pctMobile;

  // 5. Marcas Mais Desejadas
  const contagemMarcas: Record<string, number> = {};
  // A peça pode ter sido excluída depois do evento: o `peca_id` fica nulo e a
  // junção volta vazia. Sem esta checagem, o painel quebrava na visita à
  // primeira peça apagada — antes o `any` deixava o erro passar em silêncio.
  eventos.forEach((e) => {
    if (e.tipo !== "viu_peca") return;
    const marca = e.pecas?.marca;
    if (!marca) return;
    contagemMarcas[marca] = (contagemMarcas[marca] || 0) + 1;
  });

  const rankingMarcas = Object.entries(contagemMarcas)
    .map(([marca, total]) => ({
      marca,
      total,
      pct: Math.round((total / (totalViuPeca || 1)) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  // 6. Clientes Mais Engajados do Mês
  const engajamentoClientes: Record<
    string,
    { id: string; nome: string; telefone: string; eventos: number; ultimo: string }
  > = {};

  eventos.forEach((ev) => {
    if (!ev.clientes?.id) return;
    const cid = ev.clientes.id;
    if (!engajamentoClientes[cid]) {
      engajamentoClientes[cid] = {
        id: cid,
        nome: ev.clientes.nome,
        telefone: ev.clientes.telefone ?? "",
        eventos: 0,
        ultimo: ev.criado_em,
      };
    }
    engajamentoClientes[cid].eventos += 1;
    if (ev.criado_em > engajamentoClientes[cid].ultimo) {
      engajamentoClientes[cid].ultimo = ev.criado_em;
    }
  });

  const clientesMaisAtivos = Object.values(engajamentoClientes)
    .sort((a, b) => b.eventos - a.eventos)
    .slice(0, 5);

  // 7. Funil de Conversão
  const taxaAcessoParaPeca = totalAcessos
    ? Math.min(100, Math.round((totalViuPeca / totalAcessos) * 100))
    : 0;
  const taxaPecaParaWhats = totalViuPeca
    ? Math.min(100, Math.round((totalWhatsApp / totalViuPeca) * 100))
    : 0;
  const taxaWhatsParaNegocio = totalWhatsApp
    ? Math.min(100, Math.round((negociacoesAtivas.length / totalWhatsApp) * 100))
    : 0;
  const taxaNegocioParaVenda = negociacoesAtivas.length
    ? Math.min(
        100,
        Math.round(
          (vendasFechadas.length /
            (negociacoesAtivas.length + vendasFechadas.length)) *
            100
        )
      )
    : 0;

  return (
    <div className="flex flex-col gap-10">
      {/* ── Cabeçalho do Dashboard ───────────────────────────────────────── */}
      <header
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <span
            className="text-xs uppercase font-mono tracking-widest font-semibold"
            style={{ color: "var(--color-accent)" }}
          >
            BI & ANALYTICS HOROLÓGICO · POWER BI EXECUTIVE
          </span>
          <h1
            className="text-2xl sm:text-4xl mt-1 font-normal"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
            }}
          >
            Dashboard de Performance & Funil
          </h1>
          <p className="meta mt-1 text-xs">
            Inteligência comercial, geolocalização de clientes e conversão em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="border px-3 py-1.5 text-xs font-mono flex items-center gap-2"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Dados em tempo real
          </span>
        </div>
      </header>

      {/* ── KPIs Principais ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]">Acessos ao Acervo</span>
          <p className="text-2xl sm:text-3xl font-mono font-light mt-2" style={{ color: "var(--color-foreground)" }}>
            {totalAcessos}
          </p>
          <span className="meta text-[10px] mt-1">visitas de membros</span>
        </div>

        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]">Fichas Inspecionadas</span>
          <p className="text-2xl sm:text-3xl font-mono font-light mt-2" style={{ color: "var(--color-foreground)" }}>
            {totalViuPeca}
          </p>
          <span className="meta text-[10px] mt-1">visualizações de PDP</span>
        </div>

        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-accent)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]" style={{ color: "var(--color-accent)" }}>Idas ao WhatsApp</span>
          <p className="text-2xl sm:text-3xl font-mono font-light mt-2" style={{ color: "var(--color-accent)" }}>
            {totalWhatsApp}
          </p>
          <span className="meta text-[10px] mt-1">leads qualificados</span>
        </div>

        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]">Taxa de Conversão</span>
          <p className="text-2xl sm:text-3xl font-mono font-light mt-2" style={{ color: "var(--estado-ok)" }}>
            {totalAcessos ? ((totalWhatsApp / totalAcessos) * 100).toFixed(1) : "0"}%
          </p>
          <span className="meta text-[10px] mt-1">WhatsApp / Acesso</span>
        </div>

        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]">Pipeline em Mesa</span>
          <p className="text-lg sm:text-xl font-mono font-medium mt-2 truncate" style={{ color: "var(--color-foreground)" }}>
            {formatPrice(volumePipelineCentavos)}
          </p>
          <span className="meta text-[10px] mt-1">{negociacoesAtivas.length} propostas ativas</span>
        </div>

        <div
          className="border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="label text-[11px]">Estoque Total</span>
          <p className="text-lg sm:text-xl font-mono font-medium mt-2 truncate" style={{ color: "var(--color-muted)" }}>
            {formatPrice(estoqueTotalCentavos)}
          </p>
          <span className="meta text-[10px] mt-1">{pecasAtivas.length} peças publicadas</span>
        </div>
      </section>

      {/* ── Gráfico de Tendência (Responsivo Mobile/Desktop) ─────────────── */}
      <GraficoTendencia dias={diasSérie} />

      {/* ── Grid: Cidades & Dispositivos ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <section
          className="border p-6 flex flex-col gap-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="label text-sm uppercase tracking-wider">
                Geolocalização: Acessos por Cidade
              </h2>
              <p className="meta text-xs mt-0.5">
                Origem geográfica dos membros que consultam o catálogo.
              </p>
            </div>
            <span className="meta text-xs font-mono">
              {rankingCidades.length} praça{rankingCidades.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            {rankingCidades.length === 0 ? (
              <p className="meta text-xs py-4">
                Nenhuma origem identificada ainda.
              </p>
            ) : (
              rankingCidades.slice(0, 6).map((item) => (
                <div key={item.cidade} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                      {item.cidade}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.total} interações</span>
                      <span className="meta font-mono">({item.pct}%)</span>
                    </div>
                  </div>
                  <div
                    className="h-2 w-full border overflow-hidden"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max(6, item.pct)}%`,
                        background: "var(--color-accent)",
                      }}
                    />
                  </div>
                </div>
              ))
            )}

            {semOrigem > 0 && (
              <p className="meta text-xs pt-1">
                {semOrigem} {semOrigem === 1 ? "interação" : "interações"} sem
                origem identificada — fora da conta acima.
              </p>
            )}
          </div>
        </section>

        <section
          className="border p-6 flex flex-col justify-between gap-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div>
            <h2 className="label text-sm uppercase tracking-wider">
              Dispositivos dos Clientes
            </h2>
            <p className="meta text-xs mt-0.5">
              Proporção de acessos via smartphones vs desktops.
            </p>
          </div>

          <div className="flex flex-col gap-5 my-auto">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 block bg-amber-500" />
                  Mobile ({pctMobile}%)
                </span>
                <span className="flex items-center gap-1.5">
                  Desktop ({pctDesktop}%)
                  <span className="w-2.5 h-2.5 block bg-zinc-400" />
                </span>
              </div>
              <div className="h-3 w-full border flex overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
                <div style={{ width: `${pctMobile}%`, background: "var(--color-accent)" }} />
                <div style={{ width: `${pctDesktop}%`, background: "#8e93a0" }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="border p-3" style={{ borderColor: "var(--color-border)" }}>
                <span className="label text-[10px]">Smartphones</span>
                <p className="text-xl font-mono mt-1" style={{ color: "var(--color-foreground)" }}>
                  {countMobile}
                </p>
                <span className="meta text-[10px]">iOS & Android</span>
              </div>
              <div className="border p-3" style={{ borderColor: "var(--color-border)" }}>
                <span className="label text-[10px]">Computadores</span>
                <p className="text-xl font-mono mt-1" style={{ color: "var(--color-foreground)" }}>
                  {countDesktop}
                </p>
                <span className="meta text-[10px]">Mac & Windows</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] meta pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
            A navegação mobile representa a principal porta de entrada para negociações via WhatsApp.
          </p>
        </section>
      </div>

      {/* ── Grid: Funil de Conversão & Marcas ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <section
          className="border p-6 flex flex-col gap-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div>
            <h2 className="label text-sm uppercase tracking-wider">
              Funil de Conversão do Clube
            </h2>
            <p className="meta text-xs mt-0.5">
              Do acesso ao catálogo privado até o fechamento da venda.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  1. Acessos ao Acervo
                </span>
                <span className="font-mono">{totalAcessos} visitas (100%)</span>
              </div>
              <div className="h-3 w-full border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div className="h-full" style={{ width: "100%", background: "var(--color-foreground)" }} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  2. Inspeção de Ficha (PDP)
                </span>
                <span className="font-mono">{totalViuPeca} exibições ({taxaAcessoParaPeca}%)</span>
              </div>
              <div className="h-3 w-full border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.max(4, taxaAcessoParaPeca)}%`, background: "#8e93a0" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: "var(--color-accent)" }}>
                  3. Contato no WhatsApp
                </span>
                <span className="font-mono" style={{ color: "var(--color-accent)" }}>
                  {totalWhatsApp} conversas ({taxaPecaParaWhats}%)
                </span>
              </div>
              <div className="h-3 w-full border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.max(4, taxaPecaParaWhats)}%`, background: "var(--color-accent)" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                  4. Negociação Aberta na Mesa
                </span>
                <span className="font-mono">{negociacoesAtivas.length} propostas ({taxaWhatsParaNegocio}%)</span>
              </div>
              <div className="h-3 w-full border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.max(4, taxaWhatsParaNegocio)}%`, background: "#c5a059" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: "var(--estado-ok)" }}>
                  5. Venda Concluída
                </span>
                <span className="font-mono" style={{ color: "var(--estado-ok)" }}>
                  {vendasFechadas.length} vendida{vendasFechadas.length === 1 ? "" : "s"} ({taxaNegocioParaVenda}%)
                </span>
              </div>
              <div className="h-3 w-full border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${Math.max(3, taxaNegocioParaVenda)}%`, background: "var(--estado-ok)" }}
                />
              </div>
            </div>
          </div>
        </section>

        <section
          className="border p-6 flex flex-col gap-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div>
            <h2 className="label text-sm uppercase tracking-wider">
              Market Share de Desejo (Marcas)
            </h2>
            <p className="meta text-xs mt-0.5">
              Marcas que mais atraem o olhar dos colecionadores.
            </p>
          </div>

          <div className="flex flex-col gap-3.5">
            {rankingMarcas.length === 0 ? (
              <p className="meta text-xs py-4">Sem dados de marcas visualizadas ainda.</p>
            ) : (
              rankingMarcas.slice(0, 5).map((item) => (
                <div key={item.marca} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
                      {item.marca}
                    </span>
                    <span className="font-mono">
                      {item.total} visualizaç{item.total === 1 ? "ão" : "ões"} ({item.pct}%)
                    </span>
                  </div>
                  <div
                    className="h-2 w-full border overflow-hidden"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}
                  >
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${Math.max(5, item.pct)}%`,
                        background: "var(--color-foreground)",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t text-xs meta flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
            <span>Base total:</span>
            <span className="font-mono">{totalClientes ?? 0} clientes autorizados</span>
          </div>
        </section>
      </div>

      {/* ── Ranking de Clientes ──────────────────────────────────────────── */}
      <section
        className="border p-6 flex flex-col gap-6"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="label text-sm uppercase tracking-wider">
              Colecionadores Mais Ativos do Clube
            </h2>
            <p className="meta text-xs mt-0.5">
              Membros VIP que mais examinaram o acervo e peças nos últimos 30 dias.
            </p>
          </div>
          <Link
            href="/painel"
            className="link-quiet text-xs font-mono"
            style={{ color: "var(--color-accent)" }}
          >
            Ver todos os clientes →
          </Link>
        </div>

        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                <th className="py-2.5 font-mono font-medium meta uppercase tracking-wider">Cliente</th>
                <th className="py-2.5 font-mono font-medium meta uppercase tracking-wider">Telefone</th>
                <th className="py-2.5 font-mono font-medium meta uppercase tracking-wider text-right">Interações</th>
                <th className="py-2.5 font-mono font-medium meta uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {clientesMaisAtivos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 meta text-center">
                    Nenhuma interação de clientes no período.
                  </td>
                </tr>
              ) : (
                clientesMaisAtivos.map((cl) => {
                  const telLimpo = cl.telefone.replace(/\D/g, "");
                  const whatsUrl = telLimpo
                    ? `https://wa.me/${telLimpo.startsWith("55") ? telLimpo : `55${telLimpo}`}?text=${encodeURIComponent(
                        `Olá ${cl.nome.split(" ")[0]}! Como vai? Notei seu interesse no acervo da Andre Watches.`
                      )}`
                    : null;

                  return (
                    <tr key={cl.id} className="hover:bg-[var(--color-surface-2)] transition-colors">
                      <td className="py-3 font-medium">
                        <Link
                          href={`/painel/clientes/${cl.id}`}
                          className="link-quiet"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {cl.nome}
                        </Link>
                      </td>
                      <td className="py-3 font-mono meta">{cl.telefone || "—"}</td>
                      <td className="py-3 font-mono text-right font-semibold" style={{ color: "var(--color-accent)" }}>
                        {cl.eventos} ações
                      </td>
                      <td className="py-3 text-right">
                        {whatsUrl && (
                          <a
                            href={whatsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                          >
                            <span>WhatsApp</span>
                            <span aria-hidden>→</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
