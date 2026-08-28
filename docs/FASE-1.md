# FASE 1 — Fundação

> **Objetivo**: o catálogo sai do arquivo e vai para o Supabase. Ao fim da fase
> o site continua **público e visualmente idêntico** — a única diferença é de
> onde os dados vêm.
>
> **Por que essa ordem**: trocar a fonte de dados e mudar a experiência ao mesmo
> tempo é como depurar dois problemas de uma vez. Aqui a fonte muda com a tela
> parada; na Fase 2 a tela muda com a fonte já estável.

---

## Estado

| # | Passo | Status |
|---|---|---|
| 1.1 | Projeto no Supabase e variáveis de ambiente | ✅ |
| 1.2 | Esquema das tabelas + RLS | ✅ aplicado |
| 1.3 | Cliente de banco no código | ✅ |
| 1.4 | Camada de acesso a dados (`src/lib/db/`) | ✅ |
| 1.5 | Migrar o catálogo mock para o banco | ✅ 10 peças no banco |
| 1.6 | Trocar as páginas para lerem do banco | ✅ |
| 1.7 | Verificação e deploy | 🟡 verificado local; falta deploy |

Legenda: ⬜ pendente · 🟡 em andamento · ✅ concluído

---

## 1.1 — Projeto no Supabase

**Só o dono do projeto pode fazer isto** (exige conta e cartão para o free tier).

1. Criar projeto em supabase.com — região **São Paulo**, para latência
2. Copiar de *Project Settings → API*:
   - `Project URL`
   - `anon public key`
   - `service_role key` ⚠️ **segredo, nunca no cliente**
3. Preencher `.env.local` (ver `.env.example`)

Como verificar: `npm run dev` sobe sem erro de variável ausente.

---

## 1.2 — Esquema e RLS

O SQL vive em [`supabase/schema.sql`](../supabase/schema.sql), versionado.
Aplicar pelo *SQL Editor* do Supabase.

Detalhes de cada tabela e das políticas: [BANCO.md](BANCO.md).

**A regra que não pode ser quebrada**: RLS ligado em toda tabela, desde o
primeiro dia. Ligar depois significa auditar cada consulta já escrita.

Nesta fase as peças são de leitura pública, porque o site ainda é público. A
Fase 2 aperta essa política — está previsto e documentado em BANCO.md.

---

## 1.3 — Cliente de banco

Dois clientes, e a distinção importa:

- `src/lib/db/client.ts` — chave **publishable**, respeita RLS. É o padrão.
- `src/lib/db/admin.ts` — chave **secret**, ignora RLS. Só em código de
  servidor, só onde for inevitável. **Nunca importar em componente cliente.**

---

## 1.4 — Camada de acesso a dados

`src/lib/db/pecas.ts` expõe as mesmas funções que hoje vêm do mock:

```ts
listarPecas()          // era MOCK_WATCHES
buscarPecaPorSlug()    // era findWatchBySlug
listarDestaques()      // era FEATURED_WATCHES
```

**Regra**: as funções devolvem o tipo `Watch` que já existe em
`src/lib/types.ts`. Nenhum componente muda de assinatura. Se um componente
precisar mudar, o mapeamento está errado — conserte o mapeamento.

---

## 1.5 — Migração do catálogo

`scripts/seed-pecas.mjs` lê `src/lib/data/watches.ts` e insere no banco.

**Idempotente**: rodar duas vezes não duplica (usa `slug` como chave).

O arquivo `watches.ts` **não é apagado** no fim da fase — vira a semente de
referência e a rede de segurança até o banco estar validado em produção.

---

## 1.6 — Trocar as páginas

Arquivos que importam o mock hoje:

- `src/app/colecao/page.tsx`
- `src/app/relogios/[slug]/page.tsx`
- `src/app/page.tsx` (via `WatchShowcase`)
- `src/components/collection/WatchShowcase.tsx`

Todos são Server Components ou podem receber os dados por prop — **não
transformar nada em client component por causa de dados**.

`generateStaticParams` na PDP passa a consultar o banco.

---

## 1.7 — Verificação

- [x] `npx tsc --noEmit` limpo
- [x] As quatro rotas devolvem 200
- [x] O acervo mostra as mesmas 10 peças
- [x] A PDP abre igual, com preço correto
- [x] Peça vendida continua com o selo (Daytona)
- [x] Peça sem referência ainda mostra `—` (Breitling)
- [x] Consignação ainda aparece (Bluesy)
- [x] Fotos vêm ordenadas do banco
- [x] Nenhuma chave `secret` no pacote do cliente (`import "server-only"`)
- [ ] Deploy com as variáveis configuradas na Vercel

---

## ⏭️ Falta só o deploy

Local está validado. Para fechar a fase:

1. Na Vercel → Settings → Environment Variables, adicionar:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   *(a `SUPABASE_SECRET_KEY` só é necessária quando o painel existir — hoje
   nada em produção escreve no banco)*
2. `npx vercel --prod --yes`
3. Conferir que `/colecao` em produção mostra as 10 peças

---

## Feito é quando

O site em produção mostra o acervo **vindo do banco**, e ninguém que olhe a tela
percebe que algo mudou.
