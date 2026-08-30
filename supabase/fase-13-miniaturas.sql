-- ==============================================================================
-- FASE 13 — Miniatura e desfoque de espera nas fotos
-- ==============================================================================
--
-- O card do acervo mostrava a foto original: 3 ou 4 MB para preencher um
-- retângulo de 340px. Numa lista de vinte peças isso é dezenas de megabytes
-- num celular em 4G, e a lista só aparece quando tudo desce.
--
-- Duas colunas resolvem, e as duas são preenchidas no envio, dentro do
-- navegador, antes dos bytes saírem:
--
--   `url_thumb`  caminho da versão reduzida (WebP, ~1000px) usada em lista e
--                em miniatura. A original continua servindo o visualizador.
--   `blur`       miniatura minúscula embutida como data URL (~1 KB). Entra
--                desfocada no lugar da foto e some quando a real chega.
--
-- Ambas são anuláveis: as 18 fotos de semente e o que já estava no bucket
-- continuam válidos sem elas, caindo na foto original.
--
-- Idempotente. Aplicar com:
--   node scripts/aplicar-sql.mjs supabase/fase-13-miniaturas.sql

begin;

alter table public.fotos add column if not exists url_thumb text;
alter table public.fotos add column if not exists blur text;

commit;
