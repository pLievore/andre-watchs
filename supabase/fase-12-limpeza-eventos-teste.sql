-- ==============================================================================
-- FASE 12 — Remoção dos eventos de teste com origem "São Paulo - SP"
-- ==============================================================================
--
-- Até 2026-08-29 o detector de origem (`src/lib/geo.ts`) devolvia
-- "São Paulo - SP" como padrão quando não sabia responder: em desenvolvimento
-- local não há header de geo da CDN, e cliente sem telefone não dava DDD.
-- O resultado é que teste local virava "praça de São Paulo" no ranking do
-- painel — palpite apresentado como medição.
--
-- O padrão foi removido do código (a origem desconhecida agora é `null`).
-- Estas linhas são o passivo que ele deixou: 63 eventos de 2026-08-29,
-- confirmados pelo dono como testes.
--
-- O recorte por data é o que mantém o arquivo seguro de reexecutar: acesso
-- legítimo de São Paulo registrado depois disso não é tocado.

begin;

delete from public.eventos
where cidade = 'São Paulo - SP'
  and criado_em < timestamptz '2026-08-30 00:00:00-03';

commit;
