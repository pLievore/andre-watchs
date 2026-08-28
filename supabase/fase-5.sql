-- ANDRE WATCHES — Fase 5: reordenação atômica de fotos
--
-- A interface aplica a troca imediatamente com `useOptimistic`. No banco, a
-- operação também precisa ser uma só: três requests independentes podiam
-- colidir no valor temporário -1 quando o dono tocava rápido nas setas.
--
-- Idempotente. Aplicar depois de `fase-4.sql`.

begin;

create or replace function public.mover_foto(
  p_foto_id uuid,
  p_direcao text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peca_id public.fotos.peca_id%type;
  v_ordem public.fotos.ordem%type;
  v_vizinha_id public.fotos.id%type;
  v_vizinha_ordem public.fotos.ordem%type;
begin
  if p_direcao not in ('cima', 'baixo') then
    return;
  end if;

  select peca_id
    into v_peca_id
    from public.fotos
   where id = p_foto_id;

  if not found then
    return;
  end if;

  -- Uma fila por peça: galerias diferentes continuam independentes, mas dois
  -- movimentos da mesma peça nunca executam ao mesmo tempo.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_peca_id::text, 0)
  );

  select ordem
    into v_ordem
    from public.fotos
   where id = p_foto_id
     and peca_id = v_peca_id
   for update;

  if not found then
    return;
  end if;

  if p_direcao = 'cima' then
    select id, ordem
      into v_vizinha_id, v_vizinha_ordem
      from public.fotos
     where peca_id = v_peca_id
       and ordem < v_ordem
     order by ordem desc
     limit 1
     for update;
  else
    select id, ordem
      into v_vizinha_id, v_vizinha_ordem
      from public.fotos
     where peca_id = v_peca_id
       and ordem > v_ordem
     order by ordem asc
     limit 1
     for update;
  end if;

  if not found then
    return;
  end if;

  -- `fotos_ordem_unica` é DEFERRABLE (fase-4.sql), então os dois valores
  -- podem trocar no mesmo statement e a constraint só confere o estado final.
  update public.fotos
     set ordem = case id
       when p_foto_id then v_vizinha_ordem
       when v_vizinha_id then v_ordem
     end
   where id in (p_foto_id, v_vizinha_id);
end;
$$;

revoke all on function public.mover_foto(uuid, text) from public;
grant execute on function public.mover_foto(uuid, text) to service_role;

commit;
