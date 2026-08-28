# ESTADO — onde o projeto está agora

> **Leia isto primeiro.** Este arquivo responde "o que já existe e o que vem a
> seguir" em uma página. É o único documento que muda a cada entrega — se ele
> discordar de outro, ele está certo e o outro está velho.
>
> **Última atualização**: 2026-08-24 (Fase 1 validada em local)

---

## Em uma frase

Site de acervo de relógios de luxo, em transição de **vitrine pública** para
**clube fechado**: o acervo passa a exigir login e o dono ganha um painel.

---

## O que está pronto e no ar

**https://andre-watches.vercel.app** — deploy de produção, projeto
`andre-watches` na conta `plievores-projects`.

- Landing com hero de scrubbing por scroll (361 quadros, canvas 2D)
- `/colecao`, `/relogios/[slug]`, `/sobre`, `/vender`
- Sistema de design completo (papel e tinta, palco escuro no hero)
- Marca: monograma AW em `public/brand/`

## O que NÃO existe ainda

- ~~Banco de dados~~ — **feito**: Supabase, 10 peças migradas. `watches.ts`
  segue como semente de referência
- **Autenticação** — nenhuma
- **Painel administrativo** — nenhum
- **Gateway de pagamento** — fora de escopo por decisão (a venda fecha no WhatsApp)

## Bloqueios conhecidos

| O quê | Por quê | Referência |
|---|---|---|
| **Fotos são do Unsplash** | Não são peças da casa. Bloqueiam publicação real | SPEC D8 |
| **WhatsApp cai no Instagram** | `NEXT_PUBLIC_WHATSAPP_NUMBER` vazio; o CTA usa o Instagram como alternativa | SPEC D7 |

---

## Fase atual

**Fase 2 — Porta.** Autenticação, middleware, `/acesso`. O acervo fica privado
e a home vira landing institucional. **É aqui que o produto vira clube.**

Progresso: ver [FASE-2.md](FASE-2.md).

## Fases

| | Fase | Status |
|---|---|---|
| 1 | **Fundação** — Supabase, RLS, catálogo no banco | ✅ em produção |
| 2 | **Porta** — auth, acervo privado, home institucional | 🟡 em andamento |
| 3 | **Painel** — CRUD de peças, clientes, caminhos de entrada | ⬜ |
| 4 | **Inteligência** — eventos, funil identificado, saudação | ⬜ |
| 5 | **Acabamento** — mobile, estados vazios, a11y, desempenho | ⬜ |

---

## Mapa da documentação

| Arquivo | O que responde | Muda com que frequência |
|---|---|---|
| **docs/ESTADO.md** | onde estamos *(este)* | a cada entrega |
| **CLAUDE.md** | como trabalhar neste repo | raramente |
| **SPEC.md** | o que o produto é e por quê | por decisão |
| **PLANO-CLUBE.md** | o plano da fase contratada | por decisão |
| **docs/FASE-*.md** | passo a passo de cada fase | durante a fase |
| **docs/BANCO.md** | esquema, RLS, migrações | quando o banco muda |
| **docs/archive/** | versões superadas | nunca |

---

## Comandos

```bash
npm run dev              # desenvolvimento
npx tsc --noEmit         # o gate antes de dizer "pronto"
npx vercel --prod --yes  # deploy
```

⚠️ `next build` **falha localmente no Node 25** (prerender de `/_not-found`).
A Vercel builda no Node 22 e passa. Não tente consertar esse erro — valide com
`tsc`.
