# ANDRE WATCHES

Acervo privado de relógios de luxo: catálogo atrás de login, painel para o
dono da casa, venda fechada no WhatsApp.

**Comece por [`docs/ESTADO.md`](docs/ESTADO.md)** — ele diz em uma página o que
já existe, o que falta e qual é a fase atual. É o documento que muda a cada
entrega; se ele discordar de outro, ele está certo.

| Arquivo | O que responde |
|---|---|
| [docs/ESTADO.md](docs/ESTADO.md) | onde estamos, o que falta |
| [CLAUDE.md](CLAUDE.md) | como trabalhar neste repo |
| [SPEC.md](SPEC.md) | o que o produto é e por quê |
| [PLANO-CLUBE.md](PLANO-CLUBE.md) | o plano da fase contratada |
| [docs/BANCO.md](docs/BANCO.md) | esquema, RLS, migrações, as duas chaves |

## Stack

Next.js 15 (App Router, RSC) · TypeScript strict · Tailwind v4 ·
Motion (`motion/react`) para movimento · Lenis para scroll ·
Supabase (Postgres + auth + RLS + Storage privado).

## Setup

```bash
npm install
cp .env.example .env.local   # e preencha os valores
npm run dev
```

Abre em `http://localhost:3000`. As variáveis estão explicadas uma a uma em
[`.env.example`](.env.example) — o arquivo é versionado com os **nomes**, e os
valores só existem no `.env.local`, que o `.gitignore` protege.

Sem `SUPABASE_SECRET_KEY` o painel não escreve; sem `ADMIN_EMAILS` ninguém
entra em `/painel`; sem `NEXT_PUBLIC_WHATSAPP_NUMBER` todo CTA de contato cai
no Instagram da casa, de propósito, em vez de num número inventado.

## Comandos

```bash
npm run dev              # desenvolvimento
npx tsc --noEmit         # gate 1: tipos
npm run lint             # gate 2: eslint 9 (config plana em eslint.config.mjs)
npx vercel --prod --yes  # deploy (projeto já linkado)

node scripts/aplicar-sql.mjs supabase/<arquivo>.sql   # aplica uma migração
```

⚠️ `next build` **falha localmente no Node 25** (prerender de `/_not-found`).
A Vercel builda no Node 22 e passa — valide com `tsc` e `lint`, não tente
consertar esse erro.

## Estrutura

```
src/
  app/
    (site)/         vitrine e clube — hero, acervo, PDP, dossiê, conta
    (painel)/       painel do dono — clientes, peças, funil, negociações
    globals.css     tokens de design
  components/       hero, coleção, layout, mídia, contato
  lib/
    db/             fronteira com o Supabase (pecas.ts traduz banco → Watch)
    haptics.ts      retorno tátil: o que cada plataforma permite
  middleware.ts     proteção por prefixo de rota (/acervo e /painel)
public/
  hero-sequence/    361 quadros WebP do hero de desktop
  hero-mobile.mp4   vídeo boomerang do hero de mobile
supabase/           migrações SQL, na ordem, idempotentes
scripts/            pipeline de mídia e utilitários de banco
```

Os dois route groups têm layouts raiz próprios e não compartilham casca: o
painel é ferramenta de trabalho, a vitrine é peça de contemplação. O porquê
está em [docs/ESTADO.md](docs/ESTADO.md).

## Antes de publicar

Duas pendências bloqueiam a publicação de verdade, ambas registradas em
[docs/ESTADO.md](docs/ESTADO.md): as fotos de `/public/pecas` são do Unsplash
(não são peças da casa) e o número de WhatsApp ainda não foi preenchido.
