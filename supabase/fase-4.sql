-- ANDRE WATCHES — Fase 4: gestão de peças de verdade
--
-- Aplicar pelo SQL Editor do Supabase, DEPOIS de schema.sql e fase-2.sql.
-- É idempotente: pode rodar de novo.
--
-- O que muda e por quê:
--
--  1. `disponivel boolean` não conseguia dizer "em negociação". Booleano só tem
--     dois estados, e o negócio tem três — a peça que está com proposta na mesa
--     não é vendida (pode voltar) nem disponível (não adianta um segundo
--     cliente disputar sem saber). Vira o enum `estado_peca`.
--
--  2. Fotos passam a ser gerenciáveis pelo painel, então o Storage precisa de
--     bucket e políticas.
--
-- A coluna antiga é mantida em sincronia por trigger durante a transição, para
-- que nenhuma consulta ainda não migrada quebre. Ver §"Compatibilidade".

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Estado da peça
--
-- 'reservada' é o nome no banco para o que a UI chama "em negociação": descreve
-- o fato (a peça está apartada) e não a expectativa (a negociação pode não
-- fechar). Nome de dado envelhece melhor quando descreve estado, não intenção.
-- ─────────────────────────────────────────────────────────────────────────────

do $$ begin
  create type estado_peca as enum ('disponivel', 'reservada', 'vendida');
exception when duplicate_object then null; end $$;

alter table pecas
  add column if not exists estado estado_peca not null default 'disponivel';

-- Retrofit: quem já estava no banco tem só o booleano. Roda uma vez; nas
-- execuções seguintes não há linha para converter porque o estado já foi
-- gravado de verdade.
update pecas
   set estado = case when disponivel then 'disponivel' else 'vendida' end::estado_peca
 where estado = 'disponivel' and disponivel = false;

create index if not exists pecas_estado_idx on pecas (estado);

-- ─────────────────────────────────────────────────────────────────────────────
-- Compatibilidade
--
-- `disponivel` continua existindo e continua correto, derivado do estado. Assim
-- nenhuma consulta antiga passa a mentir enquanto a migração do código roda, e
-- a ordenação "disponível primeiro" segue funcionando.
--
-- É trigger e não coluna gerada porque coluna gerada não pode ser escrita, e a
-- Server Action antiga ainda escreve nela até o deploy do código novo.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function sincroniza_disponivel()
returns trigger language plpgsql as $$
begin
  -- Quem escreveu `estado` manda. Quem escreveu só `disponivel` (código antigo)
  -- tem a intenção traduzida para o enum.
  if tg_op = 'INSERT' or new.estado is distinct from old.estado then
    new.disponivel := (new.estado = 'disponivel');
  elsif new.disponivel is distinct from old.disponivel then
    new.estado := case when new.disponivel then 'disponivel' else 'vendida' end::estado_peca;
  end if;
  return new;
end $$;

drop trigger if exists pecas_sincroniza_disponivel on pecas;
create trigger pecas_sincroniza_disponivel
  before insert or update on pecas
  for each row execute function sincroniza_disponivel();

-- ─────────────────────────────────────────────────────────────────────────────
-- Fotos: o painel agora escreve
--
-- Nenhuma policy de insert/update/delete: a escrita passa pela chave secret na
-- Server Action, que já exige admin. RLS aqui continua sendo a segunda barreira
-- de LEITURA (cliente ativo), instalada em fase-2.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Ordem única por peça evita duas fotos disputando a capa depois de uma
-- exclusão concorrente. `deferrable` para permitir reordenar em lote numa
-- transação sem precisar de valores temporários.
alter table fotos drop constraint if exists fotos_ordem_unica;
alter table fotos add constraint fotos_ordem_unica
  unique (peca_id, ordem) deferrable initially deferred;

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage
--
-- Fora da transação: as funções de storage do Supabase fazem o próprio
-- controle e não gostam de rodar dentro de `begin/commit` aqui.
--
-- Bucket PRIVADO. O acervo é privado — foto de peça servida por URL pública
-- seria a brecha que anula o clube inteiro: bastaria alguém compartilhar o link
-- da imagem. As URLs chegam ao cliente como link assinado, de vida curta.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pecas',
  'pecas',
  false,
  10485760, -- 10 MB: foto de celular moderno cabe; vídeo não entra por acidente
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura direta pelo cliente ativo. O painel escreve pela chave secret, que
-- ignora isto — por isso não há policy de insert/update/delete.
drop policy if exists pecas_storage_leitura on storage.objects;
create policy pecas_storage_leitura
  on storage.objects for select
  to authenticated
  using (bucket_id = 'pecas' and (select private.e_cliente_ativo()));
