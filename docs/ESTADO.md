# ESTADO — onde o projeto está agora

> **Leia isto primeiro.** Este arquivo responde "o que já existe e o que vem a
> seguir" em uma página. É o único documento que muda a cada entrega — se ele
> discordar de outro, ele está certo e o outro está velho.
>
> **Última atualização**: 2026-08-28 (cliente ganhou navegação inferior no
> mobile, 18 fotos legadas voltaram ao acervo e descrição alternativa ficou
> opcional e recolhida; falta o deploy)

---

## Em uma frase

Site de acervo de relógios de luxo, em transição de **vitrine pública** para
**clube fechado**: o acervo passa a exigir login e o dono ganha um painel.

---

## O que está pronto e no ar

**https://andre-watches.vercel.app** — deploy de produção, projeto
`andre-watches` na conta `plievores-projects`. **Ainda roda o código da Fase
1** — o deploy da Fase 2 é um `git push` deliberado que falta dar (ver
"Estado inconsistente" abaixo).

- Landing com hero de scrubbing por scroll (361 quadros, canvas 2D)
- `/colecao`, `/relogios/[slug]`, `/sobre`, `/vender`
- Sistema de design completo (papel e tinta, palco escuro no hero)
- Marca: monograma AW em `public/brand/`

## O que está pronto em local, aguardando deploy

A Fase 2 — Porta está implementada e verificada (checklist completo em
[FASE-2.md](FASE-2.md)): `/acesso` (entrar e pedir acesso), `/acervo` e
`/acervo/[slug]` protegidos por middleware + RLS, home institucional, saudação
ligada. Testado com dois clientes descartáveis (ativo e pendente) e por
consulta direta à API sem sessão.

Além do que a Fase 2 previa: o cliente logado tem `/acervo/conta` — edita
nome e telefone, e troca a própria senha. É a mitigação do risco D24
(PLANO-CLUBE §3, "aditiva, liga quando quiser") ligada agora. No mobile, o
cliente usa uma barra inferior persistente com Acervo, Vender, A casa e Conta;
o menu sanduíche fica para visitante e dono.

O painel local também cobre o núcleo da Fase 3: cadastro e edição completos de
peças e clientes. Foto pode ser escolhida já na criação da peça e vai direto ao
bucket privado por URL assinada, sem atravessar o limite de 1 MB da Server
Action. Cadastro e edição compartilham o fluxo. A ordenação é otimista na tela
e transacional no banco (`supabase/fase-5.sql`). Testado no Chrome com três
JPEGs de 4,34 MB, rajada de oito toques e 30 movimentos concorrentes; o cadastro
descartável e seus objetos foram removidos ao fim.

As 18 fotos da semente voltaram a aparecer. Elas usam caminhos locais iniciados
por `/pecas/`; o assinador os confundia com uploads do bucket e os descartava
quando a assinatura falhava. Upload novo continua privado no formato
`slug/uuid.ext`. A descrição alternativa é gerada automaticamente e sua edição
manual ficou opcional, recolhida em cada foto.

### ⚠️ Estado inconsistente entre banco e produção

O Supabase é um projeto só, compartilhado por local e produção — não há
ambiente de staging (docs/BANCO.md). A migração `supabase/fase-2.sql` **já foi
aplicada nesse banco** em 2026-08-28, o que já fechou `pecas`/`fotos` para
qualquer leitura sem sessão de cliente ativo. O `/colecao` público que ainda
está de pé na Vercel só continua mostrando peças porque a página ficou em
cache estático de antes da troca — qualquer revalidação ou rebuild sem o
deploy desta fase o deixa vazio. A correção é publicar o código desta fase, não
reabrir o banco: era o resultado esperado (FASE-2.md §2.1), só chegou antes do
deploy.

## O que NÃO existe ainda

- ~~Banco de dados~~ — **feito**: Supabase, 10 peças migradas. `watches.ts`
  segue como semente de referência
- ~~Autenticação~~ — **feito na Fase 2**, em local. Falta publicar
- **Funil e eventos** — nada é registrado: não se sabe quem viu qual peça nem
  quem foi ao WhatsApp (Fase 4). Ver [BALANCO.md](BALANCO.md)
- **Interesses** — o clique no WhatsApp não vira registro de negociação
- **Convite por link** — terceiro caminho de entrada do D25, nunca construído
- **Gateway de pagamento** — fora de escopo por decisão (a venda fecha no WhatsApp)

## Bloqueios conhecidos

| O quê | Por quê | Referência |
|---|---|---|
| **Fotos são do Unsplash** | Não são peças da casa. Bloqueiam publicação real | SPEC D8 |
| **WhatsApp cai no Instagram** | `NEXT_PUBLIC_WHATSAPP_NUMBER` vazio; o CTA usa o Instagram como alternativa | SPEC D7 |
| **Produção com RLS de Fase 2 e código de Fase 1** | Deploy pendente após a migração já aplicada | ver acima |
| **`fase-4.sql` e `fase-5.sql` já aplicadas no banco** | Mesma situação da Fase 2: o banco tem `estado`, o bucket `pecas` e a troca atômica de ordem; produção ainda não tem o código que os usa | ver acima |

---

## Fase atual

**Fase 3 — Painel, em local.** A Porta da Fase 2 está implementada e verificada;
o núcleo do painel de peças e clientes também. Falta o convite por link para
fechar todos os caminhos previstos da Fase 3 e falta publicar o conjunto com
`git push` + `npx vercel --prod` (o banco já está migrado; é só o código que
continua local).

Detalhes do painel: ver [FASE-3.md](FASE-3.md).

## Fases

| | Fase | Status |
|---|---|---|
| 1 | **Fundação** — Supabase, RLS, catálogo no banco | ✅ em produção |
| 2 | **Porta** — auth, acervo privado, home institucional | ✅ em local · ⬜ deploy |
| 3 | **Painel** — CRUD de peças, clientes, caminhos de entrada | 🟡 peças ✅ · clientes ✅ · convite por link ⬜ |
| 4 | **Inteligência** — eventos, funil identificado, saudação | ⬜ |
| 5 | **Acabamento** — mobile, estados vazios, a11y, desempenho | ⬜ |

---

## Vitrine e painel são produtos separados

`src/app/(site)` e `src/app/(painel)` são **route groups irmãos**, com layouts
raiz próprios. Não compartilham header, rodapé nem Lenis — só os tokens de CSS.

Motivo: o painel é ferramenta de trabalho usada todo dia, a vitrine é peça de
contemplação. Herdar a casca do site trazia scroll suave para dentro de uma
tabela, que é ativamente ruim para quem trabalha.

Tokens do painel: escopo `.painel` em `globals.css`.

**As portas também são separadas**: `/acesso` para o cliente, `/painel/entrar`
para a casa. O guard do painel vive em `painel/(interno)/layout.tsx`; a porta
fica fora dele, senão exigiria a sessão que existe para ser criada ali.

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
