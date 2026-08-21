# SPEC.md — ANDRE WATCHES

> **Status**: v3.0 — pivot de concepção (sneakers → relógios de luxo)
> **Owner**: Paulo Leoni
> **Referência de negócio**: [@andrewatchesbr](https://instagram.com/andrewatchesbr) — "Compra • Venda • Troca • Consignação · Somente originais · Desde 2012 trabalhando com relógios de luxo"
> **Última atualização**: 2026-08-20
> **Stack base**: Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 + Motion + Lenis
> **Escopo desta fase**: **front-end apenas**. Sem DB, sem gateway, sem checkout. Ecommerce é fase E.
> **Histórico**: a v2.0 (NEXUS DROP, sneakers) está arquivada em `docs/archive/SPEC-nexus-drop-v2.md`.

---

## 0. Como usar este documento

Fonte da verdade do projeto. Toda decisão técnica, visual ou de produto referencia
uma seção daqui. Ao codar: *"implementa §4.2 do SPEC.md"*.

Convenções: **MUST** = obrigatório · **SHOULD** = desvio precisa de justificativa · **MAY** = opcional.

Os agentes especialistas em `.claude/agents/` deferem a este documento. Contradição
entre agente e SPEC → o SPEC ganha.

---

## 1. Visão & Princípios

### 1.1 Pitch
**ANDRE WATCHES** é a vitrine digital de uma casa de relógios de luxo em operação
desde 2012. Rolex e outras maisons premium do mercado secundário: compra, venda,
troca e consignação. Somente peças originais, com procedência conferida uma a uma.
A experiência é editorial e cinematográfica — o site precisa transmitir a mesma
precisão que o produto vende.

### 1.2 Modelo de negócio
- **Tipo**: mercado secundário de relógios de luxo (compra, venda, troca, consignação)
- **Estoque**: peças próprias + peças em consignação de terceiros
- **Ticket**: alto (R$ 20k – R$ 300k+ por peça). A ordem de grandeza muda tudo no design:
  ninguém compra um Daytona por impulso num carrossel.
- **Rotatividade**: baixa em volume, alta em valor. O catálogo é pequeno por definição.
- **Canal de conversão nesta fase**: **preço visível no site + CTA para WhatsApp/DM**.
  É como a casa já opera. Carrinho fica arquitetado mas desligado (§7).
- **Fluxo inverso (metade do negócio)**: a casa COMPRA e aceita troca/consignação.
  Isso é rota de primeira classe (`/vender`), não link de rodapé.

### 1.3 Princípios não-negociáveis
1. **Somente originais, e dito com precisão.** Nunca "autenticidade garantida" solto:
   sempre qualificado — procedência conferida, cartão de garantia, ano, o que acompanha.
2. **Dado horológico correto ou ausente.** Referência, calibre, ano e material errados
   destroem a credibilidade justamente com o comprador que entende. Sem dado → `—`.
3. **Escassez é fato, não tática.** "1 unidade" é informação. Countdown falso, "últimas
   horas" e badge de promoção são **proibidos**.
4. **Mobile-first.** 70%+ do tráfego vem do Instagram, em celular. Valida no iPhone SE primeiro.
5. **Performance é estética.** LCP < 2.5s no 4G é requisito de design, não de infra.
6. **Contraste baixo, respiro alto.** Luxo é discreto: preço nunca em bold, nada grita.
7. **Acessibilidade não é opcional.** `prefers-reduced-motion`, contraste AA, teclado.

### 1.4 O que NÃO somos
- **Não somos revendedor autorizado** de Rolex, Patek Philippe, AP ou qualquer maison.
  Mercado secundário, e isso fica explícito no rodapé e no `/sobre`. MUST.
- Não somos marketplace — curadoria fechada, estoque conhecido peça a peça.
- Não vendemos réplica, homage ou "inspirado". Nunca.
- Não fazemos leilão nem urgência artificial.

---

## 2. Stack Técnico

### 2.1 Core (travado — herdado da v2, validado)
- **Framework**: Next.js 15+ (App Router, RSC)
- **Linguagem**: TypeScript strict
- **Estilo**: Tailwind CSS v4 + CSS Variables (`@theme`)
- **Animação**: Motion (`motion/react`). NÃO GSAP, NÃO ScrollTrigger, NÃO framer-motion legado.
- **Scroll**: Lenis (`lenis/react`) via `SmoothScroll` no layout — dirige o scroll real,
  então `useScroll`/`useTransform` funcionam sem fiação extra.
- **Imagens**: `next/image`, assets locais em `/public`. Vídeo: `<video>` nativo.

### 2.2 Fase E (ecommerce — NÃO implementar agora, mas não fechar porta)
- DB Neon Postgres + Drizzle · Auth Better-Auth · Mercado Pago (PIX + cartão)
- Storage Cloudflare R2 · Email Resend · Analytics Vercel + PostHog · Sentry
- O tipo `Watch` de `src/lib/types.ts` MUST ter a mesma forma que o Drizzle vai
  devolver, para a troca de mock por DB não alterar assinatura de componente.

### 2.3 Infra atual
- Hosting Vercel (projeto já linkado, `npx vercel --prod`)
- Domínio: validar `andrewatches.com.br` no registro.br

### 2.4 A EVITAR
- ❌ Inter, Roboto, Arial
- ❌ shadcn/ui aplicado raso
- ❌ Three.js/WebGL no hero — canvas 2D scrubbing resolve
- ❌ Bootstrap, Material UI, Lottie pesado em mobile

---

## 3. Sistema de Design

### 3.1 Paleta — papel claro e tinta
Decisão D15: **claro editorial**, referência em catálogo de leilão (Phillips,
A Collected Man), não em vitrine de revenda. A v3.0 era escura com acento de aço
frio, que lia como tech/hype — e o comprador de alto relógio não é público tech.
Argumento adicional, não de gosto: boa parte da footage foi filmada em ciclorama
branco e brigava com uma página preta.

```css
@theme {
  --color-background: #faf8f4; /* papel osso, quente */
  --color-foreground: #17181a; /* tinta, não preto puro */
  --color-muted:      #6e6a63; /* cinza quente — 4.7:1, passa AA */
  --color-border:     #e2ded6; /* fio de cabelo */
  --color-surface:    #f2efe9; /* card, um tom abaixo do papel */

  --color-accent:      #17181a; /* o acento é a própria tinta */
  --color-accent-soft: #8a7758; /* pátina — NÃO-TEXTUAL, não passa AA */
  --color-accent-gold: #9a7d4a; /* two-tone / ouro */
}
```
#### Palco escuro (D17)
O site é papel, **mas o hero é escuro**. Não é um segundo tema: é o fundo do
filme dentro de uma publicação impressa.

Motivo medido: a footage tem luminância média de 126–153 contra 248 do papel.
Encostar as duas cria duas emendas horizontais duras e a faixa lê como
retângulo colado. No escuro a mesma imagem lê como luz emergindo, sem costura.

```css
--color-stage: #0d0e0f;
--color-stage-foreground: #f2f0ea;
--color-stage-muted: #9b978f;
--color-stage-border: #2a2c2e;
```

Implementação: a classe `.on-stage` **redefine os tokens no escopo**, então tudo
que já lê `var(--color-*)` se inverte sozinho. **Não criar variantes `-invert` de
componente** — basta envolver no `.on-stage`.

Regra: nunca hex solto em componente. Sempre `var(--color-*)`.
Modo escuro global: fora de escopo.

### 3.2 Tipografia
- **Display** (`--font-display`): serif editorial de alto contraste, para hero e títulos
- **Body** (`--font-sans`): sans neutra e legível
- **Mono** (`--font-mono`): eyebrows, **referência**, ano, preço em contexto técnico
- Escala fluida com `clamp()`, corpo mínimo 16px, hero até 11rem em desktop
- Eyebrows/nav: uppercase, mono, tracking `0.3em`–`0.4em`

### 3.3 Espaçamento
- Base 4px. Padding de seção: `clamp(5rem, 11vw, 13rem)` no eixo Y.
- Gutter: `1.5rem` mobile, `2rem` desktop.

### 3.4 Motion
- Easing padrão: `cubic-bezier(0.22, 1, 0.36, 1)` → var `--ease-editorial`, tuple `[0.22,1,0.36,1]`
- Duração: 600–1000ms em reveals, 200–300ms em hover
- Stagger 0.1–0.2s
- **Zero bounce.** Relógio não quica. Spring, se houver, é amortecido (`bounce: 0`).
- Animar só `transform` e `opacity`
- TODA animação respeita `prefers-reduced-motion: reduce`

### 3.5 Vocabulário de movimento da marca
| Gesto | Comportamento |
|---|---|
| Ponteiro | rotação contínua, `linear` |
| Bezel | rotação em cliques discretos (120 cliques = 3°) — snap, não slide |
| Mostrador | escala máxima 1.06 no reveal |
| Detalhe macro | parallax de profundidade, máx. 40px |

---

## 4. Hero — Scroll-driven Watch Disassembly

### 4.1 Comportamento (D3 travada)
Relógio centralizado, ocupando 100vh. Ao descer nos primeiros ~200vh:
- **Frame 1 é a peça inteira e perfeita.** É a primeira impressão do site e o
  frame que quem não rola nunca deixa — não pode ser um estado intermediário.
- **Fase 1 (0 → 50% do trecho)**: a peça se abre. Cristal, bezel, mostrador,
  ponteiros, caixa, fundo com rotor e elos se separam no ar, revelando o interior.
  Subir o scroll remonta.
- **Fase 2 (50% → 100%)**: escala 1.0 → 1.4 com deslocamento sutil para cima;
  copy lateral já visível desde scroll=0, value-props revelam em stagger na fase 1

A partir daí, scroll normal para a vitrine (§5).

**Por que abrir e não girar**: giro 360° começa e termina no mesmo lugar, sem
payoff, e não diz nada. Abrir é a tese do negócio virando movimento — a casa
vende procedência conferida peça a peça, e o site literalmente abre a peça.

**Restrições de produção** (o scrubbing impõe, não são preferência):
1. Movimento **monotônico** — vai-e-volta força `skipFrames` (foi o jitter da v2).
2. Câmera **travada**. Qualquer movimento de câmera embaralha o scrubbing.
3. **Todo frame é uma foto parada boa**, porque o usuário vai parar em cima.
4. Peça **sem marca e sem texto** no mostrador: logo de maison deformado por IA
   é identificado na hora pelo público que entende, e é marca registrada.
5. Explosão no nível de **macro-componente** (cristal, bezel, mostrador, ponteiros,
   caixa, fundo, elos) — nunca ponte/escape/rubis, que a IA inventa errado.

### 4.2 Implementação
**MUST** reusar `src/components/hero/HeroSequence.tsx` — já é parametrizado
(`framesBasePath`, `framePrefix`, `frameCount`, `mobileFrameCount`, `skipFrames`) e
já resolve preload progressivo, `requestIdleCallback`, fallback de conexão lenta,
fallback de reduced-motion e fallback de canvas. Estender, não reescrever.

```
/public/hero-sequence/<prefix>-001.webp ... -072.webp
```
- 72 frames desktop / 48 mobile · WebP q80 · ~40–60KB cada · teto ~4MB
- Canvas 2D `drawImage`, nunca swap de `<img>`
- Mobile: sequência reduzida; boomerang em `<video>` é fallback aceitável

### 4.3 Assets — fase provisória
Enquanto não houver render/foto definitivos da peça real, os frames são gerados por
IA (mesmo pipeline da v2: geração → `ffmpeg` → `sharp`/`cwebp`). Drift de pixel é
esperado; corrigir excisando trechos via `skipFrames` (ver `scripts/scan-angle-match.mjs`).

**MUST**, antes de ir ao ar: o relógio do hero é uma peça genérica/estilizada OU uma
peça real do estoque fotografada. Nunca um render de IA apresentado como peça à venda.

### 4.4 Fallbacks
- `prefers-reduced-motion: reduce` → frame estático com fade-in
- `effectiveType` 2g/slow-2g ou `saveData` → idem
- Canvas indisponível → `<img>` estático
- Estado de `loading` durante o preload inicial

### 4.5 Copy do hero
- H1: máximo 6 palavras, escala display
- Subhead: 1 linha, editorial
- CTA primário: "Ver coleção" · CTA secundário: "Vender ou trocar"
- Value props (stagger): procedência, desde 2012, consignação, entrega segurada

---

## 5. Vitrine (home)

### 5.1 Comportamento
- Trilho horizontal com `scroll-snap-type: x mandatory`
- Parallax sutil no scroll vertical
- Hover desktop: lift 8px, borda ganha gradiente de platina, foto secundária em crossfade
- Tap mobile: abre PDP

### 5.2 Card de produto
- Imagem 4:5
- Marca (mono, tracking largo) + modelo (display)
- **Referência** em mono, `--color-muted`
- Preço em sans regular — **nunca bold**
- Chips discretos: condição (`NOVO` / `SEMINOVO` / `PRÉ-OWNED`), ano, o que acompanha
  (`FULL SET` / `CAIXA E PAPÉIS` / `SOMENTE RELÓGIO`)
- **Proibido**: badge de promoção, frete grátis, countdown
- Peça vendida: card dimmed com selo `VENDIDO` (espelha o destaque "Vendidos" do
  Instagram — prova social é ativo aqui)

### 5.3 Quantidade
6–8 peças na home + link "Ver toda a coleção" → `/colecao`.

---

## 6. PDP — `/relogios/[slug]`

### 6.1 Desktop
Split 60/40, info sticky. Galeria de 5–8 fotos: frontal, perfil da caixa, fecho,
verso, coroa, macro do mostrador, caixa/documentos. Foto principal com zoom em hover.

### 6.2 Mobile
Galeria full-width com swipe + indicador. Info em stack. CTA fixo no bottom após scroll.

### 6.3 Info do produto
- Marca + modelo + referência
- Condição (destacada) + ano do cartão de garantia
- Preço + linha discreta "Parcelamento e formas de pagamento sob conversa"
- **CTA primário: "Falar sobre esta peça" → WhatsApp** com mensagem pré-preenchida
  contendo modelo e referência
- CTA secundário: "Tenho um relógio para trocar" → `/vender`
- Acordeão expandido por padrão:
  - **A peça** — narrativa, procedência, contexto
  - **Estado** — descrição honesta de marcas de uso, com foto do detalhe
  - **Especificações** — referência, calibre, diâmetro, material, pulseira, ano, o que acompanha
  - **Como funciona a compra** — conferência, pagamento, envio segurado
- "Outras peças da casa" — 3–4 relacionadas

---

## 7. Conversão (fase front-end)

- **Sem carrinho, sem checkout.** Toda intenção de compra vai para o WhatsApp.
- Componente `WhatsappCta` centraliza número e template de mensagem — MUST ser ponto
  único de verdade, para trocar o número em um lugar só.
- A arquitetura de tipos MUST permitir plugar carrinho depois sem refatorar o catálogo.
- `/vender`: formulário de avaliação (marca, modelo, ref., ano, o que acompanha, fotos)
  que, nesta fase, monta uma mensagem de WhatsApp — sem backend.

---

## 8. Performance Budget

| Métrica | Mobile (4G) | Desktop |
|---|---|---|
| LCP | < 2.5s | < 1.8s |
| INP | < 200ms | < 100ms |
| CLS | < 0.05 | < 0.05 |
| JS inicial | < 180KB | < 220KB |

O LCP é o frame estático inicial do hero, nunca a sequência.

---

## 9. Acessibilidade

Contraste AA · navegação por teclado completa (Tab, Enter, Esc) · foco visível ·
`prefers-reduced-motion` desliga scroll-driven e mantém fades · `aria-label` em botão
de ícone · skip link · headings sem pulo ·
`alt` horológico: *"Rolex Submariner Date ref. 126610LN, mostrador preto, vista frontal"*.

---

## 10. SEO & Metadata

- `metadata` API em toda página
- Schema.org `Product` na PDP: `brand`, `sku`/`mpn` (referência), `offers`,
  `itemCondition`, `availability`
- `LocalBusiness` / `Store` no `/sobre`
- URLs: `/relogios/[slug]` no formato `rolex-submariner-date-126610ln`
- Open Graph por peça
- Sitemap dinâmico

---

## 11. Rotas (fase front-end)

| Rota | Conteúdo |
|---|---|
| `/` | Hero + vitrine + prova/ethos + CTA de fechamento |
| `/colecao` | Grid completo, filtro por marca e condição |
| `/relogios/[slug]` | PDP |
| `/sobre` | Casa desde 2012, como a procedência é conferida, disclaimer de não-autorizado |
| `/vender` | Compra, troca e consignação |

---

## 12. Roadmap

### Fase A — Reskin & fundação (agora)
- [x] Decisões travadas (§14)
- [x] Agentes especialistas em `.claude/agents/`
- [x] Design system novo (paleta aço/platina, tipografia, tokens)
- [x] Modelo de domínio `Watch` + catálogo mock
- [x] Header/Footer/metadata rebrandados
- [x] Vitrine + card de produto
- [x] Seções de ethos e CTA reescritas

### Fase B — Páginas
- [x] `/colecao` com filtros (marca + disponibilidade)
- [x] `/relogios/[slug]` PDP completa (Schema.org Product, galeria, specs)
- [x] `/sobre` (Schema.org Store + disclaimer) e `/vender` (form → conversa)
- [x] `WhatsappCta` unificado — ativa sozinho quando D7 entrar em
      `NEXT_PUBLIC_WHATSAPP_NUMBER`; até lá cai no Instagram da casa

### Fase C — Hero (entregue na v1 da mecânica)
- [x] `HeroBand.tsx`: faixa que cresce + scrubbing por scroll (D11)
- [x] Sequência de 361 frames WebP 1440px (16,5 MB, 30fps nativo) com carga em densidade progressiva
- [x] Variante mobile: `<video>` nativo em loop, sem scrubbing
- [x] Fallback de reduced-motion: poster estático, faixa aberta
- [ ] Avaliar se os cortes da montagem incomodam no scrub — se sim, gerar um
      take único com câmera travada e trocar a sequência (o componente não muda)
- [ ] Peso: 17,2 MB de frames (1920px nativo, 30fps) é aposta deliberada em qualidade e fluidez (D13). Reavaliar em device real no 4G — o dial é `fps` na extração.

### Fase D — Polish
- [ ] Auditoria a11y + performance
- [ ] Schema.org + OG por peça
- [ ] Testes em device real

### Fase E — Ecommerce (futuro)
DB, admin, carrinho, Mercado Pago, frete, NF-e.

---

## 13. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Foto/render de IA confundida com peça real à venda | Média | **Alto** (jurídico + reputação) | §4.3 MUST: hero é estilizado ou peça real fotografada |
| Site sugerir revenda autorizada de maison | Média | **Alto** | Disclaimer explícito no rodapé e `/sobre` (§1.4) |
| Dado horológico errado no catálogo | Alta | Alto | Sem dado → `—`; conferir com o dono do estoque antes de publicar |
| Ticket alto não converte por formulário | Certa | Baixo | Por isso a conversão é WhatsApp nesta fase (§7) |
| Fotos de estoque inconsistentes (fundo, luz) | Alta | Médio | Agente `asset-pipeline` normaliza; 4:5 e fundo padrão |
| **Demo ir ao ar com foto que não é da peça** | Média | **Alto** | `/public/pecas/` é Unsplash, marcado no topo de `watches.ts`. Bloqueio de publicação até D8 fechar |
| Peso da sequência do hero estourar budget mobile | Média | Médio | 48 frames mobile, fallback de conexão lenta |

---

## 14. Decisões Fechadas

| # | Decisão | Resolução | Data |
|---|---|---|---|
| D1 | Marca | **ANDRE WATCHES** (alinhado a @andrewatchesbr) | 2026-08-20 |
| D2 | Paleta | Preto + **aço/platina frio**; ouro champagne só em two-tone | 2026-08-20 |
| D3 | Hero motion | **Desmontagem**: relógio inteiro no frame 1, abre no scroll (canvas scrubbing, frames de IA sem marca) | 2026-08-20 |
| D4 | Conversão | **Preço visível + CTA WhatsApp**; carrinho arquitetado mas desligado | 2026-08-20 |
| D5 | Escopo | Front-end apenas; ecommerce é fase E | 2026-08-20 |
| D6 | Domínio | Validar `andrewatches.com.br` | pendente |
| D7 | Número de WhatsApp | pendente — bloqueia `WhatsappCta` real | pendente |
| D8 | Fotos do estoque | **pendente e BLOQUEANTE.** O catálogo hoje roda com fotos do Unsplash em `/public/pecas/` — material de demonstração para o cliente ver o comportamento da vitrine, do card e da PDP. **Nenhuma delas é peça da casa.** Substituir tudo antes de publicar. | pendente |
| D9 | Marca no material visual | **Exibir Rolex** (peça, mostrador e tipografia). Decisão do dono, tomada após o risco de §1.4/§13 ser levantado. Disclaimer de mercado secundário no rodapé e no `/sobre` permanece obrigatório. | 2026-08-20 |
| D10 | Material do hero | Vídeo gerado por IA, próprio da casa (`Video Project 10.mp4`). É uma montagem com cortes, então **não** serve pra um plano único — mas serve pra scrubbing como sequência de frames. | 2026-08-20 |
| D15 | Identidade visual | **Claro editorial** — papel osso, tinta, serifa. Substitui o escuro+aço da v3.0, que carregava os tiques do NEXUS DROP (mono maiúsculo com tracking largo, fundo quase preto, sparkles de fundo). Mecânica de scroll intocada: as barras do hero leem `--color-background`, então viraram cortina de papel sem alterar uma linha de coreografia. | 2026-08-20 |
| D22 | Mobile volta ao vídeo | Scrubbing exige hero de 250vh, e no celular isso sequestra a navegação — o usuário rola e a página não sai do lugar. O mobile passa a ter hero de uma tela com vídeo nativo em loop (recorte 3:4, 3,4 MB). O scrim continua adaptativo, indexado pelo tempo do vídeo em vez do scroll. Revoga D20. | 2026-08-21 |
| D21 | Hero em sangria com scrim adaptativo | A faixa cinemascope dava foco à peça e rebaixava a frase a legenda de margem. O vídeo passa a ocupar a tela inteira e a copy vira camada principal sobre ele. Viabilizado por scrim de opacidade variável: a luminância de cada quadro é medida offline (`src/lib/hero-luma.ts`) e o sombreamento se ajusta de 0,12 a 0,80 para manter o contraste do texto constante. Substitui D11. | 2026-08-21 |
| D20 | Scrubbing no mobile | O telefone deixa de receber vídeo em loop e passa a ter a mesma coreografia dirigida por scroll do desktop, com sequência própria (181 frames a 900px, 3,6 MB, 15fps). Viabilizado por **janela deslizante**: só ~31 quadros vivem em memória, teto de ~54 MB contra os 330 MB da sequência inteira — acima do que o iOS Safari tolera. | 2026-08-21 |
| D19 | Dissolução sub-frame | O canvas mistura os dois frames vizinhos por `globalAlpha` em vez de arredondar o índice. Sem isso o scroll lento pisa em degraus de 4,5px (361 estados visuais em 1620px); com 8 sub-passos são ~2900. A mistura só entra quando está entre frames e a velocidade é baixa — em scroll rápido o movimento já borra sozinho. | 2026-08-20 |
| D18 | Header acompanha o palco | O header nasce escuro sobre o hero e vira papel na chegada da vitrine, interpolando `--color-foreground/muted/border` — logo, nav e CTA se invertem por herança, sem lógica própria. Detecta o palco por `[data-stage-hero]`, então rota sem hero já começa em papel, sem configuração. A virada começa em 72% do hero: interpolar do topo passaria metade do caminho em cinza médio, o pior estado de legibilidade sobre footage de luminância parecida. | 2026-08-20 |
| D17 | Palco escuro no hero | O site é papel, o hero é escuro. A tentativa de claro em toda a página quebrou onde há footage: degrau de luminância de 248 para ~145 com duas emendas duras, lendo como retângulo colado. Resolvido com o escopo `.on-stage`, que redefine os tokens localmente — nenhuma variante de componente foi criada e a coreografia não mudou. | 2026-08-20 |
| D16 | Vocabulário tipográfico | Mono maiúsculo com tracking 0.3–0.4em some do projeto. Eyebrow vira serifa itálica em caixa de frase; rótulos de UI viram sans discreta; a mono sobrevive só em dado técnico (referência, calibre, ano) e sem tracking. Centralizado nas classes `.eyebrow` / `.label` / `.meta` / `.btn` do `globals.css` — não repetir estilo inline. | 2026-08-20 |
| D14 | Vídeo de ofício | Segundo material de IA, **retrato 480×854, 31s**, macro de gravação/índices/acabamento. Vai pro `/sobre`, como painel vertical sticky ao lado dos passos de conferência — usa o formato retrato nativamente em vez de recortar, e ilustra literalmente o que o texto descreve. Sem texto por cima (mesma regra do D11). | 2026-08-20 |
| D13 | Fluidez acima de peso | Hero em **30fps nativo** (361 frames, 16,5 MB) — todos os quadros da fonte, teto de fluidez. Decisão explícita do dono: "aumente a qualidade, compensamos o desempenho no restante do site". Mitigado por carga em densidade progressiva e por cortar o vídeo do mobile de 8 MB para 1,5 MB. | 2026-08-20 |
| D12 | Inércia do scroll | O scroll não dirige a coreografia direto. Lenis com `lerp: 0.085` (era 0.18) dá deslize à página, e o hero soma uma mola **superamortecida** (ζ ≈ 1.41, acomoda em ~0,4s) entre o scroll e frames/faixa/texto. Soltar desacelera; não congela. Nunca reduzir o `damping` abaixo de ~14 — vira overshoot e quebra o "relógio não quica". | 2026-08-20 |
| D11 | Mecânica do hero | **Faixa que cresce + scrubbing.** Peça numa faixa cinemascope, título na margem preta de cima, subtexto e CTAs na de baixo; o scroll abre a faixa até a sangria total e move o texto pra fora, enquanto o índice do frame acompanha o scroll de ponta a ponta. Texto e vídeo nunca se sobrepõem — requisito, porque a luminância do material alterna (77% de pixels claros aos 1s, 12% aos 5s). | 2026-08-20 |

---

## 15. Glossário

- **Referência (ref.)**: código do modelo (`126610LN`)
- **Calibre**: movimento do relógio (`3235`)
- **Full set**: relógio + caixa + cartão de garantia + manuais + selo
- **Two-tone / Rolesor**: combinação aço + ouro
- **Lume**: material luminescente dos índices e ponteiros
- **PDP**: Product Detail Page
- **Scrubbing**: controlar mídia via input externo (scroll)
- **RSC**: React Server Components
- **LCP/INP/CLS**: Core Web Vitals
