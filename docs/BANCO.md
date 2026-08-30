# BANCO — Supabase

> Esquema, políticas e o raciocínio por trás. O SQL executável vive em
> [`supabase/schema.sql`](../supabase/schema.sql) — este arquivo explica **por
> quê**, o SQL diz **o quê**.

## Migrações, na ordem

Todas idempotentes: rodar de novo não quebra nada.

| Arquivo | O que faz | Aplicada |
|---|---|---|
| `supabase/schema.sql` | `pecas`, `fotos`, tipos, RLS ligado | ✅ |
| `supabase/fase-2.sql` | `clientes`, `solicitacoes_acesso`, fecha o acervo | ✅ 2026-08-28 |
| `supabase/fase-4.sql` | enum `estado_peca`, bucket `pecas`, ordem única de foto | ✅ 2026-08-28 |
| `supabase/fase-5.sql` | função transacional para reordenar fotos | ✅ 2026-08-28 |
| `supabase/fase-6.sql` | tabela `convites`, RLS, expiração de 7 dias | ✅ 2026-08-28 |
| `supabase/fase-7.sql` | tabelas `eventos` e `interesses`, RLS e pipeline | ✅ 2026-08-28 |
| `supabase/fase-8-encomendas.sql` | tabela `encomendas` (pedido de peça que a casa ainda não tem), RLS | ✅ 2026-08-28 |
| `supabase/fase-9-analytics.sql` | `eventos.cidade` e `eventos.dispositivo`, índice por cidade | ✅ 2026-08-28 |
| `supabase/fase-10-seguranca-limpeza.sql` | **correção**: as políticas de `encomendas` passam a exigir `private.e_cliente_ativo()`; remove o admin de `clientes` | ✅ 2026-08-28 |
| `supabase/fase-11-integralidade-relogio-caixa.sql` | enum `integralidade` com `relogio-e-caixa` e `diametro_mm` numeric | ✅ 2026-08-29 |
| `supabase/fase-12-limpeza-eventos-teste.sql` | apaga os 63 eventos de teste que o padrão "São Paulo - SP" tinha criado | ✅ 2026-08-29 |
| `supabase/fase-13-miniaturas.sql` | `fotos.url_thumb` e `fotos.blur` — miniatura e desfoque gerados no envio | ✅ 2026-08-30 |
| `supabase/fase-14-guardadas-e-propostas.sql` | tabelas `guardadas` (lista do cliente, RLS) e `propostas` (venda pela vitrine) | ✅ 2026-08-30 |

```bash
node scripts/aplicar-sql.mjs supabase/fase-5.sql
```

Usa a `DIRECT_URL` (porta 5432, modo sessão) e envia o arquivo inteiro numa
chamada só — fatiar por `;` quebraria os blocos `do $$ … $$` e o corpo das
funções, que têm ponto e vírgula dentro.

## Tipos, gerados do banco

`src/lib/db/tipos-banco.ts` descreve a forma real do esquema e é passado aos
três clientes (`db`, `dbServidor`, `dbAdmin`). **É arquivo gerado** — rode
`node scripts/gerar-tipos-banco.mjs` depois de cada migração e versione o
resultado junto com o SQL.

Não é preciosismo: enquanto as consultas devolviam `any`, o painel filtrava
peças por uma coluna `publicado` que nunca existiu — o valor em estoque
aparecia zerado e ninguém sabia por quê. O tipo achou isso na primeira
compilação.

---

⚠️ **A `fase-10` conserta a `fase-8`.** A política de inserção em `encomendas`
nasceu checando só `cliente_id = auth.uid()`, sem exigir cliente **ativo** —
quem tivesse conta pendente, recusada ou inativa conseguia registrar encomenda.
As duas migrações são do mesmo dia, então a janela foi curta, mas fica
registrado: migração de segurança que não aparece nesta lista não existe para
quem for auditar depois.

---

## Por que Supabase

O produto passou a depender de *quem é você* em toda página. Autenticação
escrita do zero seria o pedaço mais caro e mais arriscado da entrega — sessão,
cookie seguro, hash, recuperação, limite de tentativas.

| | por que pesou |
|---|---|
| Postgres de verdade | crescer não exige migração traumática |
| Auth pronta | resolve o maior risco da fase 2 |
| **RLS** | o acervo fica protegido **no banco**, não só na aplicação |
| Storage | fotos sem contratar outro serviço |
| Free tier | folgado no volume real dele |

Neon e Turso são bons bancos, mas deixariam auth por nossa conta — e nenhum tem
RLS. Para acervo privado de peça cara, RLS é a diferença entre uma falha isolada
e um vazamento: se sobrar um endpoint desprotegido, o banco ainda nega.

---

## Região: ca-central-1

O projeto ficou no Canadá, não em São Paulo. É ~120ms a mais por consulta para
o público brasileiro.

**Decisão consciente de manter** (2026-08-24): o acervo é privado, os clientes
são poucos e específicos, e o banco já estava povoado. Recriar custaria mais que
os 120ms valem.

Registrado para não ser reaberto. Se um dia o volume justificar, a migração é
rodar `schema.sql` e `seed-pecas.mjs` num projeto novo.

---

## Convenção de nomes

**Tabelas e colunas em português, código em inglês.** O SQL é lido junto com o
dono do negócio, que fala de peça, mostrador e integralidade — não de `piece` e
`dial`. A tradução acontece uma vez só, na camada `src/lib/db/`.

---

## Tabelas

### `pecas`

Espelha o tipo `Watch` de `src/lib/types.ts`.

**Toda especificação é NULL-ável de propósito.** Referência, calibre, diâmetro,
ano — publicar dado errado é pior que publicar sem dado (SPEC §1.3), e a UI já
sabe mostrar `—`. Um `not null` aqui obrigaria alguém a inventar.

`preco_centavos` é `bigint` e não `numeric`: dinheiro em inteiro não tem erro de
arredondamento. Peça de R$ 300 mil cabe folgado.

**`estado` é o estado comercial** — enum `estado_peca`: `disponivel`,
`reservada`, `vendida`. Começou como `disponivel boolean` e não deu conta: a
peça com proposta na mesa não é vendida (pode voltar) nem disponível (não
adianta um segundo cliente disputar sem saber que há alguém na frente). Um
booleano tem dois estados e o negócio tem três.

A ordem do enum é a ordem em que o dono pensa no estoque, então
`order by estado` já entrega a listagem certa sem `case`.

`disponivel` **continua existindo**, derivado de `estado` por trigger
(`sincroniza_disponivel`, em `fase-4.sql`). Não é redundância por descuido: a
migração precisava rodar antes do deploy do código novo, e sem a coluna
sincronizada toda consulta ainda não migrada passaria a mentir durante a
janela entre uma coisa e outra. O trigger funciona nos dois sentidos — quem
escreve `estado` atualiza o booleano, quem escreve só o booleano (código
antigo) tem a intenção traduzida para o enum.

### `fotos`

Separada de `pecas` porque uma peça tem de 1 a 8 fotos, **a ordem importa**, e
cada uma precisa do próprio `alt` horológico. Em array seria custoso reordenar e
impossível indexar.

`on delete cascade`: apagar a peça leva as linhas de foto junto.

⚠️ **O cascade não alcança o Storage.** Ele apaga a linha, não o arquivo. Quem
exclui peça ou foto tem que remover os objetos do bucket na mesma operação —
é o que `excluirPeca` e `excluirFoto` fazem. Sem isso o bucket vira depósito de
imagem órfã que nenhuma tela consegue mais listar nem apagar.

`fotos_ordem_unica (peca_id, ordem)` impede duas fotos disputando a capa e é
`DEFERRABLE`, para que duas posições possam trocar no mesmo statement. A função
`mover_foto` de `fase-5.sql` faz essa troca em uma transação e usa advisory lock
por peça: toques concorrentes são serializados e nunca deixam ordem temporária.

### Storage: bucket `pecas`

**Privado.** Foto de peça com URL pública seria o furo que anula o clube
inteiro: bastaria alguém compartilhar o endereço da imagem, e o acervo estaria
na rua sem ninguém precisar de login. Verificado: `getPublicUrl` responde 400.

O cliente recebe link assinado de uma hora, gerado no servidor por
`src/lib/db/fotos.ts` — em lote, uma chamada para a lista inteira, porque uma
por peça faria dezenas de idas ao Storage só para montar o acervo.

Limites no próprio bucket (10 MB, só imagem): validação que a aplicação não
pode esquecer de fazer.

No painel, upload usa URL assinada de escrita. Uma Server Action autenticada
reserva caminhos aleatórios, o navegador envia os bytes diretamente ao bucket
e outra ação verifica os objetos antes de inserir todas as linhas de `fotos`.
Assim arquivos acima de 1 MB não atravessam o limite de payload das Server
Actions. Falha parcial remove os objetos; upload abandonado é recolhido numa
tentativa posterior após a janela de duas horas.

### `clientes`

Quem pode entrar. O `id` referencia `auth.users(id)` — a identidade mora no
Supabase Auth; telefone, status e último acesso ficam aqui. `on delete
cascade`: apagar o usuário no Auth apaga o cliente, não sobra registro órfão.

`status` é exatamente o que a função `private.e_cliente_ativo()` verifica antes
de liberar leitura de `pecas`/`fotos` — ver "RLS" abaixo.

### `solicitacoes_acesso`

A fila do caminho "pedir acesso" (PLANO-CLUBE §4). **Um pedido não é uma
identidade**: esta tabela não toca `auth.users`. Criar a conta no Auth antes da
aprovação permitiria que qualquer pessoa ocupasse o e-mail de um futuro
cliente — por isso o pedido fica só aqui, sem login nenhum, até o painel da
Fase 3 aprovar e promovê-lo a `clientes` de verdade.

RLS ligado, sem nenhuma policy: só a chave `secret`, no servidor, lê ou
escreve. O navegador nunca consulta esta tabela diretamente.

### Ainda não criadas — chegam na fase que precisar delas

| Tabela | Fase |
|---|---|
| `convites` | 3 — link de uso único |
| `eventos` | 4 — funil |
| `interesses` | 4 — pipeline de venda |

Nenhuma das três existe hoje. Ver [BALANCO.md](BALANCO.md).

Criar tabela antes da fase que a usa gera esquema morto que ninguém valida.
Os tipos enum delas já estão no `schema.sql` porque são baratos e evitam uma
migração a mais.

---

## RLS — a mudança que já aconteceu

**Fase 1**: o site era público, leitura de `pecas` e `fotos` liberada para
qualquer um.

**Fase 2** trocou as duas políticas por uma que não pergunta só "está
autenticado", pergunta "é cliente ativo" — aplicada no banco de produção em
2026-08-28, confirmada por consulta direta com a chave publishable:

```sql
create or replace function private.e_cliente_ativo()
returns boolean language sql security definer stable
set search_path = ''
as $$
  select exists (
    select 1 from public.clientes
    where id = (select auth.uid()) and status = 'ativo'
  );
$$;

create policy pecas_leitura_cliente_ativo
  on pecas for select
  to authenticated
  using ((select private.e_cliente_ativo()));
```

`auth.role() = 'authenticated'` sozinho não bastaria: um cliente recusado ou
desativado continua autenticado e não pode ver nada mesmo assim. A função mora
no schema `private` (não `public`) e é `security definer` para poder ler
`clientes` de dentro da política sem cair em recursão de RLS.

**Escrita nunca passa por RLS.** Não existe política de `insert`, `update` ou
`delete` — toda escrita usa a chave `secret`, só no servidor, só pelo
painel. Um cliente comprometido não consegue alterar nada, porque o caminho não
existe.

---

## As duas chaves, e a que não pode vazar

O Supabase renomeou as chaves: `anon` virou **publishable**, `service_role`
virou **secret**. Os nomes antigos ainda aparecem em tutoriais pela internet.

| Chave | Variável | Onde | Respeita RLS |
|---|---|---|---|
| publishable *(era anon)* | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pode ir ao navegador | **sim** |
| secret *(era service_role)* | `SUPABASE_SECRET_KEY` | **só no servidor** | **não — ignora tudo** |

A `secret` no pacote do cliente entrega o banco inteiro para qualquer um que
abra o inspetor. Por isso ela mora em `src/lib/db/admin.ts`, com aviso no topo
do arquivo, e nunca é importada por componente cliente.

Regra prática: se o arquivo tem `"use client"`, ele não pode importar `admin.ts`.

---

## As connection strings

`DATABASE_URL` e `DIRECT_URL` estão no `.env.example` mas **o código não usa
nenhuma das duas**. As consultas passam pela API do Supabase, não por conexão
direta ao Postgres.

Ficam registradas porque:

- um ORM (Drizzle, Prisma) precisaria delas se entrar depois
- migração por linha de comando usa a `DIRECT_URL`

A diferença entre as duas: `DATABASE_URL` aponta para o pooler em **modo
transação** (porta 6543), que é o certo para aplicação serverless, onde cada
requisição pode abrir conexão nova. `DIRECT_URL` é o pooler em **modo sessão**
(porta 5432) — necessário para migração, porque modo transação não suporta
comando de esquema.

⚠️ As duas carregam a **senha do banco** em texto claro. Nunca no `.env.example`,
nunca em commit.

---

## Índices

| Índice | Por quê |
|---|---|
| `pecas.slug` (unique) | a PDP busca por slug; unique também impede duplicata na semente |
| `pecas_disponivel_idx` | o grid filtra disponível o tempo todo |
| `pecas_marca_idx` | filtro por marca na `/colecao` |
| `fotos_peca_idx` | busca fotos de uma peça já ordenadas |

Poucos e justificados. Índice a mais custa escrita e engana quem lê depois.

---

## `atualizado_em`

Mantido por gatilho, não pela aplicação. Aplicação esquece; gatilho não. E
quando o painel existir, vai ser por esse campo que o Andre vê o que mexeu por
último.
