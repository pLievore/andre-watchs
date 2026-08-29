-- ==============================================================================
-- FASE 9 — Enriquecimento Geográfico & Analytics
-- ==============================================================================

alter table public.eventos add column if not exists cidade text;
alter table public.eventos add column if not exists dispositivo text;
create index if not exists eventos_cidade_idx on public.eventos(cidade);