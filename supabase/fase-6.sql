-- =============================================================================
-- FASE 6 — Convites por link (uso único, validade 7 dias)
-- =============================================================================
--
-- Idempotente: pode ser executado múltiplas vezes com segurança.
-- Aplicar com: node scripts/aplicar-sql.mjs supabase/fase-6.sql

create table if not exists public.convites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  nome_sugerido text,
  criado_por text not null,
  expira_em timestamptz not null default (now() + interval '7 days'),
  usado_em timestamptz,
  cliente_id uuid references public.clientes(id) on delete set null,
  criado_em timestamptz not null default now()
);

create index if not exists convites_token_idx on public.convites(token);
create index if not exists convites_expira_idx on public.convites(expira_em);

-- RLS ligado desde o primeiro dia.
-- Sem políticas para anon/authenticated: o acesso é 100% via chave secret (dbAdmin) no servidor.
alter table public.convites enable row level security;
