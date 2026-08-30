-- ==============================================================================
-- FASE 14 — Peças guardadas pelo cliente e propostas de venda
-- ==============================================================================
--
-- Duas tabelas, dois problemas diferentes:
--
-- 1. `guardadas` — o único sinal de interesse que existia era o clique no
--    WhatsApp, que é um passo grande: quem ainda está namorando a peça não
--    fala com ninguém, e a casa não fica sabendo de nada. Guardar é o gesto
--    pequeno que faltava, e no painel vira demanda visível por peça.
--
-- 2. `propostas` — o formulário de "Vender" montava uma mensagem e pulava para
--    o WhatsApp. Quem não completasse o pulo sumia sem deixar rastro, e com o
--    número ainda não configurado a proposta ia parar no Instagram. Agora ela
--    fica registrada antes de qualquer pulo.
--
-- Idempotente. Aplicar com:
--   node scripts/aplicar-sql.mjs supabase/fase-14-guardadas-e-propostas.sql

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Guardadas
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.guardadas (
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  peca_id    uuid not null references public.pecas (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (cliente_id, peca_id)
);

create index if not exists guardadas_peca_idx on public.guardadas (peca_id);

alter table public.guardadas enable row level security;

-- O cliente enxerga e mexe apenas na própria lista, e apenas enquanto está
-- ativo — mesma regra que libera o acervo para ele.
drop policy if exists "cliente_le_suas_guardadas" on public.guardadas;
create policy "cliente_le_suas_guardadas"
  on public.guardadas
  for select
  to authenticated
  using (
    cliente_id = (select auth.uid())
    and (select private.e_cliente_ativo())
  );

drop policy if exists "cliente_guarda_peca" on public.guardadas;
create policy "cliente_guarda_peca"
  on public.guardadas
  for insert
  to authenticated
  with check (
    cliente_id = (select auth.uid())
    and (select private.e_cliente_ativo())
  );

drop policy if exists "cliente_solta_peca" on public.guardadas;
create policy "cliente_solta_peca"
  on public.guardadas
  for delete
  to authenticated
  using (
    cliente_id = (select auth.uid())
    and (select private.e_cliente_ativo())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Propostas de venda
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type public.status_proposta as enum (
    'nova', 'em_avaliacao', 'recusada', 'fechada'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.propostas (
  id              uuid primary key default gen_random_uuid(),
  -- Quem mandou. `cliente_id` só existe quando a pessoa já é do clube; a
  -- proposta vem da vitrine pública, então nome e contato são o essencial.
  cliente_id      uuid references public.clientes (id) on delete set null,
  nome            text not null,
  contato         text not null,
  intencao        text not null,
  marca           text not null,
  modelo          text,
  referencia      text,
  ano             text,
  integralidade   text,
  observacao      text,
  status          public.status_proposta not null default 'nova',
  criado_em       timestamptz not null default now()
);

create index if not exists propostas_status_idx
  on public.propostas (status, criado_em desc);

alter table public.propostas enable row level security;

-- Sem política nenhuma: a inserção passa por Server Action com a chave secret,
-- que valida antes de gravar. Abrir `insert` para anônimo aqui seria abrir um
-- formulário de escrita direta no banco para a internet inteira.

commit;
