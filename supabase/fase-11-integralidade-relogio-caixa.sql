-- ==============================================================================
-- FASE 11: Adição da opção 'relogio-e-caixa' ao enum integralidade
-- e flexibilização da coluna diametro_mm para suportar medidas decimais (ex: 40.5mm)
-- ==============================================================================

alter type public.integralidade add value if not exists 'relogio-e-caixa';

alter table public.pecas alter column diametro_mm type numeric;
