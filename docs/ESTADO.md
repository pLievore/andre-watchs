# ESTADO — onde o projeto está agora

> **Leia isto primeiro.** Este arquivo responde "o que já existe e o que vem a
> seguir" em uma página. É o único documento que muda a cada entrega — se ele
> discordar de outro, ele está certo e o outro está velho.
>
> **Última atualização**: 2026-08-30 (rodada de acabamento: miniatura de foto
> no envio, esqueletos de espera, ícone e cartão de compartilhamento, guardar
> peça, propostas de venda registradas, tipos gerados do banco — e o retorno
> tátil ao arrastar pela barra, nos dois sentidos)

---

## Em uma frase

Site de acervo de relógios de luxo que **já é clube fechado**: o acervo exige
login, o dono tem painel, e a venda fecha no WhatsApp.

---

## O que está no ar

**https://andre-watches.vercel.app** — projeto `andre-watches` na conta
`plievores-projects`. A produção roda o código atual do `main`: a rodada de
acabamento de 2026-08-30 foi publicada e conferida no ar (home, `/sobre`,
`/vender` e `/acesso` em 200; `/acervo` e `/painel` redirecionando; manifesto,
ícones e cartão de compartilhamento respondendo).

### Domínio próprio, em transição

`andrewatches.com.br` foi comprado na Hostinger e **já está registrado no
projeto da Vercel** (raiz e `www`), com `NEXT_PUBLIC_SITE_URL` apontando para
ele. Falta o que só se faz no painel da Hostinger: apontar o DNS.

| Onde | Tipo | Nome | Valor |
|---|---|---|---|
| Hostinger → DNS | `A` | `@` | `76.76.21.21` |
| Hostinger → DNS | `CNAME` | `www` | `cname.vercel-dns.com` |

O raiz é o endereço canônico — é o que o `metadataBase` assina, o que vai no
cartão de compartilhamento e o que sai no convite por WhatsApp. O `www`
redireciona para ele por regra no `next.config.ts`.

⚠️ Enquanto o DNS não propagar, **a prévia de link fica quebrada**: o endereço
da imagem de compartilhamento aponta para `andrewatches.com.br`, que ainda não
resolve.

**Vitrine pública**

- Landing com hero dirigido por scroll (361 quadros em canvas no desktop;
  vídeo boomerang de uma tela no mobile)
- `/sobre`, `/vender`, `/acesso` e a home institucional
- Sistema de design completo (papel e tinta, palco escuro no hero)

**Acabamento da rodada de 2026-08-30** (em local, aguardando deploy)

- Fotos entram em três formas — original, miniatura de 1000px e desfoque de
  espera —, todas geradas no navegador antes do envio
- Esqueleto de carregamento no acervo, na peça e na conta
- Ícone do site, ícone de aplicativo, manifesto (instalar na tela de início) e
  cartão de compartilhamento nas páginas públicas — **nunca nas de peça**
- Voltar de uma peça devolve o cliente à posição onde ele estava na lista
- Cliente guarda peça; o painel mostra quantos guardaram cada uma
- Proposta de venda fica registrada antes de qualquer pulo para o WhatsApp
- Ordenação no acervo, busca e filtro na lista de peças do painel
- Tipos do banco gerados e ligados aos três clientes — `any` virou erro de lint

**Clube** — exige sessão e `clientes.status = 'ativo'`

- `/acervo` e `/acervo/[slug]`, protegidos por middleware **e** RLS
- `/acervo/[slug]/dossie` — ficha técnica diagramada em A4 para impressão
- `/acervo/conta` — nome, telefone e troca da própria senha
- `/convite/[token]` — convite por link de uso único, validade de 7 dias
- Encomenda ("procuro um relógio assim") registrada pelo cliente
- No mobile, barra inferior com Acervo, Vender, A casa e Conta. As quatro
  telas vivem num shell único (`SiteTabShell`) com deslize lateral 1:1

**Painel do dono** — `/painel`, e-mail listado em `ADMIN_EMAILS`

- Clientes: cadastro, edição, quatro status, exclusão e gerador de convites
- Peças: cadastro e edição com upload direto ao bucket privado (a foto não
  passa pela Server Action) e ordenação transacional
- Dashboard: funil de 30 dias, ranking de peças, origem e dispositivo
- Negociações: pipeline comercial com quatro status
- Conta do admin, separada da conta de cliente

## Banco

Todas as migrações de `supabase/` estão aplicadas — conferido por consulta
direta ao banco em 2026-08-29 (tabelas `clientes`, `convites`, `encomendas`,
`eventos`, `fotos`, `interesses`, `pecas`, `solicitacoes_acesso`). O registro
com data está na tabela do topo de [BANCO.md](BANCO.md).

Não existe staging: local e produção falam com o **mesmo** projeto Supabase.
Migração aplicada vale para os dois na hora — por isso ela entra antes da tela
que a usa, nunca depois.

## O que NÃO existe ainda

- **Gateway de pagamento** — fora de escopo por decisão (a venda fecha no
  WhatsApp)
- **Testes automatizados** — o gate hoje é `npx tsc --noEmit` mais `npm run
  lint`, os dois limpos. Autenticação, RLS e os quatro status de cliente não
  têm rede de proteção além de teste manual
- **Transição da foto do card para a peça** — a continuidade real (a mesma
  foto crescendo até a página) depende de recurso experimental do Next; hoje a
  foto assenta na chegada, que é o que dá para prometer sem risco

## Bloqueios conhecidos

| O quê | Por quê | Referência |
|---|---|---|
| **Fotos são do Unsplash** | Não são peças da casa. Bloqueiam publicação real | SPEC D8 |
| **WhatsApp cai no Instagram** | `NEXT_PUBLIC_WHATSAPP_NUMBER` vazio; o CTA usa o Instagram como alternativa | SPEC D7 |

---

## Fase atual

**Fase 5 — Acabamento.** As fases 1 a 4 estão publicadas. O que veio depois
delas (encomendas, dossiê, dashboard de BI, navegação por abas com deslize)
foi entregue sem virar fase própria — daí não haver `docs/FASE-4.md` em
diante.

O que a fase 5 ainda deve: revisão de acessibilidade, estados vazios, peso do
JavaScript no cliente (o shell de abas monta todas as telas de uma vez) e as
fotos reais no lugar das do Unsplash.

## Fases

| | Fase | Status |
|---|---|---|
| 1 | **Fundação** — Supabase, RLS, catálogo no banco | ✅ em produção |
| 2 | **Porta** — auth, acervo privado, home institucional | ✅ em produção |
| 3 | **Painel** — CRUD de peças, clientes, caminhos de entrada | ✅ em produção |
| 4 | **Inteligência** — eventos, funil identificado, interesses | ✅ em produção |
| 5 | **Acabamento** — mobile, estados vazios, a11y, desempenho | 🔄 em andamento |

## Dois route groups, duas cascas

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
