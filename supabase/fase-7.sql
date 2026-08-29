-- =============================================================================
-- FASE 7 — Inteligência: Eventos e Pipeline de Interesses
-- =============================================================================

do $$ begin
  create type tipo_evento as enum ('acesso', 'viu_peca', 'foi_whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_interesse as enum ('em_conversa', 'negociando', 'vendido', 'perdido');
exception when duplicate_object then null; end $$;

-- 1. Tabela eventos
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo tipo_evento not null,
  peca_id uuid references public.pecas(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_cliente_idx on public.eventos(cliente_id, criado_em desc);
create index if not exists eventos_peca_idx on public.eventos(peca_id, criado_em desc);
create index if not exists eventos_tipo_idx on public.eventos(tipo, criado_em desc);
create index if not exists eventos_criado_em_idx on public.eventos(criado_em desc);

alter table public.eventos enable row level security;

-- 2. Tabela interesses (pipeline de negociação da casa)
create table if not exists public.interesses (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  peca_id uuid not null references public.pecas(id) on delete cascade,
  status status_interesse not null default 'em_conversa',
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint interesses_cliente_peca_unica unique (cliente_id, peca_id)
);

create index if not exists interesses_status_idx on public.interesses(status);
create index if not exists interesses_atualizado_idx on public.interesses(atualizado_em desc);

-- Trigger para manter atualizado_em em interesses
drop trigger if exists interesses_toca_atualizado_em on public.interesses;
create trigger interesses_toca_atualizado_em
  before update on public.interesses
  for each row execute function toca_atualizado_em();

alter table public.interesses enable row level security;