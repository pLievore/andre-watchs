-- ==============================================================================
-- FASE 8: Encomendas VIP ("Estou Procurando um Relógio")
-- ==============================================================================

create table if not exists public.encomendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  marca text not null,
  modelo text not null,
  referencia text,
  ano_desejado text,
  orcamento_maximo text,
  observacoes text,
  status text not null default 'em_busca' check (status in ('em_busca', 'atendido', 'cancelado')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists encomendas_cliente_idx on public.encomendas(cliente_id);
create index if not exists encomendas_status_idx on public.encomendas(status);

alter table public.encomendas enable row level security;

-- Cliente autenticado pode inserir sua própria encomenda
create policy "cliente_insere_sua_encomenda"
  on public.encomendas
  for insert
  to authenticated
  with check (
    cliente_id in (
      select id from public.clientes where id = auth.uid()
    )
  );

-- Cliente autenticado pode ler suas próprias encomendas
create policy "cliente_le_suas_encomendas"
  on public.encomendas
  for select
  to authenticated
  using (
    cliente_id in (
      select id from public.clientes where id = auth.uid()
    )
  );

-- Service role tem acesso irrestrito
create policy "service_role_encomendas"
  on public.encomendas
  for all
  to service_role
  using (true)
  with check (true);