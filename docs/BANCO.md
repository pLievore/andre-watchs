# BANCO — Supabase

> Esquema, políticas e o raciocínio por trás. O SQL executável vive em
> [`supabase/schema.sql`](../supabase/schema.sql) — este arquivo explica **por
> quê**, o SQL diz **o quê**.

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

### `fotos`

Separada de `pecas` porque uma peça tem de 1 a 8 fotos, **a ordem importa**, e
cada uma precisa do próprio `alt` horológico. Em array seria custoso reordenar e
impossível indexar.

`on delete cascade`: apagar a peça leva as fotos junto. Não existe foto órfã.

### Ainda não criadas — chegam na fase que precisar delas

| Tabela | Fase |
|---|---|
| `clientes` | 2 — quem pode entrar |
| `convites` | 3 — link de uso único |
| `eventos` | 4 — funil |
| `interesses` | 4 — pipeline de venda |

Criar tabela antes da fase que a usa gera esquema morto que ninguém valida.
Os tipos enum delas já estão no `schema.sql` porque são baratos e evitam uma
migração a mais.

---

## RLS — e a mudança prevista

**Hoje (Fase 1)**: o site ainda é público, então leitura de `pecas` e `fotos` é
liberada para qualquer um.

**Na Fase 2**, essas duas políticas viram:

```sql
drop policy pecas_leitura_publica on pecas;
create policy pecas_leitura_autenticada
  on pecas for select
  using (auth.role() = 'authenticated');
```

Está escrito aqui para que a troca seja um passo previsto e não uma descoberta.

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
