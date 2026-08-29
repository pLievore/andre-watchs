-- ==============================================================================
-- FASE 10: Correção de Segurança em Encomendas & Descontaminação de Dados
-- ==============================================================================

begin;

-- 1. CORREÇÃO RLS: encomendas agora exige private.e_cliente_ativo()
drop policy if exists "cliente_insere_sua_encomenda" on public.encomendas;
create policy "cliente_insere_sua_encomenda"
  on public.encomendas
  for insert
  to authenticated
  with check (
    cliente_id = (select auth.uid())
    and (select private.e_cliente_ativo())
  );

drop policy if exists "cliente_le_suas_encomendas" on public.encomendas;
create policy "cliente_le_suas_encomendas"
  on public.encomendas
  for select
  to authenticated
  using (
    cliente_id = (select auth.uid())
    and (select private.e_cliente_ativo())
  );

-- 2. DESCONTAMINAÇÃO: Remove o e-mail de admin da tabela clientes e limpa o ruído do funil
-- (A tabela auth.users permanece intocada, o admin continua acessando o painel normalmente)
delete from public.clientes
where email = 'paulo_lievore@hotmail.com';

commit;