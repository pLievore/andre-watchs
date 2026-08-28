-- ANDRE WATCHES — esquema
--
-- Aplicar pelo SQL Editor do Supabase. É idempotente: pode rodar de novo.
-- Documentação de cada decisão em docs/BANCO.md.
--
-- REGRA: RLS ligado em TODA tabela desde o primeiro dia. Ligar depois obriga a
-- auditar cada consulta já escrita.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type condicao as enum ('novo', 'seminovo', 'pre-owned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type integralidade as enum ('full-set', 'caixa-e-papeis', 'somente-relogio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_cliente as enum ('ativo', 'pendente', 'recusado', 'inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_evento as enum ('acesso', 'viu_peca', 'foi_whatsapp');
exception when duplicate_object then null; end $$;

do $$ begin
  create type status_interesse as enum ('em_conversa', 'negociando', 'vendido', 'perdido');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Peças
--
-- Espelha o tipo `Watch` de src/lib/types.ts. Campos de especificação são
-- NULL-áveis de propósito: publicar referência errada é pior que publicar sem
-- referência (SPEC §1.3). A UI mostra `—` quando falta.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists pecas (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,

  marca           text not null,
  modelo          text not null,
  condicao        condicao not null,
  integralidade   integralidade not null,

  -- Especificações: tudo opcional, ver comentário acima
  referencia      text,
  calibre         text,
  diametro_mm     smallint,
  material_caixa  text,
  pulseira        text,
  mostrador       text,
  ano_cartao      smallint,

  preco_centavos  bigint not null check (preco_centavos >= 0),
  disponivel      boolean not null default true,
  consignada      boolean not null default false,

  historia        text,
  notas_estado    text,

  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index if not exists pecas_disponivel_idx on pecas (disponivel);
create index if not exists pecas_marca_idx on pecas (marca);

-- ─────────────────────────────────────────────────────────────────────────────
-- Fotos
--
-- Tabela separada porque uma peça tem de 1 a 8 fotos e a ordem importa —
-- guardar em array dificultaria reordenar e escrever `alt` individual.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists fotos (
  id       uuid primary key default gen_random_uuid(),
  peca_id  uuid not null references pecas (id) on delete cascade,
  url      text not null,
  alt      text not null,
  ordem    smallint not null default 0
);

create index if not exists fotos_peca_idx on fotos (peca_id, ordem);

-- ─────────────────────────────────────────────────────────────────────────────
-- Manter `atualizado_em` sozinho
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function toca_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists pecas_atualizado_em on pecas;
create trigger pecas_atualizado_em
  before update on pecas
  for each row execute function toca_atualizado_em();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
--
-- FASE 1: o site ainda é público, então leitura é liberada.
-- FASE 2: estas duas políticas serão trocadas por leitura só para autenticado.
--         A troca está prevista em docs/BANCO.md.
--
-- Escrita nunca passa por aqui: só a chave service_role, no servidor.
-- ─────────────────────────────────────────────────────────────────────────────

alter table pecas  enable row level security;
alter table fotos  enable row level security;

drop policy if exists pecas_leitura_publica on pecas;
create policy pecas_leitura_publica
  on pecas for select
  using (true);

drop policy if exists fotos_leitura_publica on fotos;
create policy fotos_leitura_publica
  on fotos for select
  using (true);
