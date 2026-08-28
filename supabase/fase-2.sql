-- ANDRE WATCHES — Fase 2: a porta
--
-- Aplicar pelo SQL Editor do Supabase, DEPOIS do schema.sql. É idempotente.
--
-- ⚠️ ESTE ARQUIVO FECHA O ACERVO. Assim que rodar, o site público para de
-- mostrar peças até as telas da Fase 2 existirem. Isso é intencional: a
-- proteção entra antes das telas, nunca depois — o contrário deixaria uma
-- janela de tempo com acervo exposto.

-- ─────────────────────────────────────────────────────────────────────────────
-- Clientes
--
-- A identidade mora no Supabase Auth (auth.users). Aqui ficam só os dados de
-- negócio. O `id` é o mesmo dos dois lados, então RLS consegue amarrar a sessão
-- ao status sem consulta extra.
--
-- `on delete cascade`: apagar o usuário no Auth apaga o cliente. Não sobra
-- registro órfão apontando para identidade que não existe mais.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists clientes (
  id             uuid primary key references auth.users (id) on delete cascade,
  nome           text not null,
  email          text unique not null,
  telefone       text,

  status         status_cliente not null default 'pendente',

  -- Contexto que a pessoa escreveu ao pedir acesso. Ajuda o Andre a decidir.
  observacao     text,

  criado_em      timestamptz not null default now(),
  ultimo_acesso  timestamptz
);

create index if not exists clientes_status_idx on clientes (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- Quem é cliente ativo
--
-- Função em vez de subconsulta repetida: a regra fica num lugar só, e mudar o
-- que significa "pode ver" não exige caçar políticas.
--
-- `security definer` para poder ler `clientes` de dentro da política sem cair
-- em recursão de RLS.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function e_cliente_ativo()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from clientes
    where id = auth.uid() and status = 'ativo'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- O acervo fecha
--
-- Não basta estar autenticado: um cliente recusado ou desativado continua com
-- login válido e não pode ver nada.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists pecas_leitura_publica on pecas;
drop policy if exists fotos_leitura_publica on fotos;

drop policy if exists pecas_leitura_cliente_ativo on pecas;
create policy pecas_leitura_cliente_ativo
  on pecas for select
  using (e_cliente_ativo());

drop policy if exists fotos_leitura_cliente_ativo on fotos;
create policy fotos_leitura_cliente_ativo
  on fotos for select
  using (e_cliente_ativo());

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS de clientes
--
-- O cliente lê só o próprio registro — precisa disso para o nome na saudação.
-- Não pode alterar nada: mudar o próprio `status` seria escalada de privilégio.
-- Toda escrita passa pela chave secret, no servidor.
-- ─────────────────────────────────────────────────────────────────────────────

alter table clientes enable row level security;

drop policy if exists clientes_le_o_proprio on clientes;
create policy clientes_le_o_proprio
  on clientes for select
  using (id = auth.uid());
