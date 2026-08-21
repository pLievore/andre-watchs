# SPEC.md — NEXUS DROP

> **Status**: v2.0 (decisões fechadas, pronto pra execução)
> **Owner**: Paulo Leoni
> **Sócio**: (cobre branding, visual, copy, fotografia)
> **Última atualização**: 2026-05-18
> **Stack base**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Motion
> **Custo de infra estimado**: < R$ 50/mês na fase MVP (domínio + transações Mercado Pago)

---

## 0. Como usar este documento

Fonte da verdade do projeto. Toda decisão técnica, visual ou de produto deve referenciar uma seção daqui. Quando estiver codando com Claude Code, sempre referencia: *"implementa §4.2 do SPEC.md"*.

Convenções:
- **MUST** = obrigatório, bloqueia merge
- **SHOULD** = forte recomendação, desvio precisa de justificativa
- **MAY** = opcional

Mudanças no SPEC entram via commit dedicado (`docs(spec): ...`). Toda alteração relevante vira linha no CHANGELOG.md.

---

## 1. Visão & Princípios

### 1.1 Pitch
**NEXUS DROP** é uma boutique digital de sneakers premium da coleção pessoal do fundador, oferecidos a preço de outlet. Cada peça é única ou de estoque limitado — não há reposição contínua. A experiência de compra é cinematográfica, inspirada em Apple e SSENSE, posicionando produto premium em ticket acessível como diferencial real.

### 1.2 Modelo de negócio
- **Tipo**: liquidação de coleção pessoal via CNPJ (varejo de calçados usados/seminovos — CNAE 4782-2/01 sugerido, validar com contador)
- **Estoque**: próprio, físico, em poder do fundador
- **Reposição**: não há — cada SKU vendido sai do catálogo permanentemente (ou volta a 0 unidades)
- **Ticket alvo**: R$ 150 - R$ 300 por peça (outlet positioning)
- **Margem**: livre, definida unicamente pelo fundador (produto próprio)
- **Implicação legal**: produtos devem ser descritos honestamente quanto a estado (novo, seminovo, usado em bom estado). Falsa descrição = violação CDC.

### 1.3 Princípios não-negociáveis
1. **Honestidade radical na descrição** — estado real, marca real, autenticidade declarada. Toda foto mostra desgaste real (se houver). É o oposto de fast-fashion: estamos vendendo verdade premium.
2. **Premium > completo** — 20-40 SKUs perfeitamente apresentados, não catálogo gigante.
3. **Mobile-first** — 70%+ tráfego BR é mobile. Tudo validado primeiro no iPhone SE.
4. **Performance é estética** — LCP < 2.5s no 4G é requisito de design.
5. **Storytelling > especificação** — cada peça tem narrativa (origem, history, ocasiões de uso).
6. **Acessibilidade não é opcional** — `prefers-reduced-motion`, contraste AA, navegação por teclado.

### 1.4 O que NÃO somos
- Não somos marketplace — curadoria fechada e pessoal
- Não somos fast-fashion — sem urgency manipulativa, sem countdown falso
- Não vendemos novidades — vendemos peças com história a preço acessível
- Não somos revendedor autorizado de Nike/Jordan — somos liquidação de coleção pessoal

---

## 2. Stack Técnico (locked, free tier first)

### 2.1 Core
- **Framework**: Next.js 15+ (App Router, RSC, Server Actions)
- **Linguagem**: TypeScript strict
- **Estilo**: Tailwind CSS v4 + CSS Variables
- **Animação**: Motion (motion.dev)
- **Forms**: React Hook Form + Zod
- **State**: Zustand (cart + UI), sem Redux

### 2.2 Backend & Dados
- **DB**: Neon Postgres (free tier — 500MB, suficiente pros primeiros 6-12 meses)
- **ORM**: Drizzle
- **CMS de produto**: Postgres direto (sem Sanity — economia + simplicidade no MVP)
- **Auth**: Better-Auth (open source, free, suficiente pro admin solo)
- **Storage de imagens**: Cloudflare R2 (free tier 10GB) + Cloudflare Images como CDN

### 2.3 Pagamentos
- **Gateway único**: Mercado Pago (PIX + Cartão)
- **PIX**: 10% desconto, destaque visual no checkout
- **Cartão**: até 3x sem juros (acima disso, com juros)
- **Boleto**: NÃO oferecer na v1 (baixa conversão em premium, complica conciliação)
- **Frete grátis**: SHOULD ter regra acima de R$ 500 (ajustável)

### 2.4 Logística & Fiscal
- **Frete**: Melhor Envio (Correios PAC/SEDEX + Jadlog + Latam Cargo)
- **NF-e**: emissão via integração futura com Bling ou Tiny (pós-MVP). No MVP, emissão manual pelo emissor do contador.
- **Política de devolução**: 7 dias (mínimo legal CDC, art. 49)

### 2.5 Infra & DevOps
- **Hosting**: Vercel (Hobby plan free — 100GB bandwidth/mês)
- **Domínio**: `nexusdrop.com.br` (validar disponibilidade) ou alternativa — registro no registro.br (~R$ 40/ano)
- **Subdomínio temporário**: Vercel default (`*.vercel.app`) até domínio próprio
- **Email transacional**: Resend (free tier — 3.000 emails/mês)
- **Analytics**: Vercel Analytics (free) + PostHog Cloud (free até 1M events/mês)
- **Monitoramento**: Sentry (free tier — 5k events/mês)

### 2.6 Bibliotecas a EVITAR
- ❌ Inter, Roboto, Arial — usar fonte distinta (ver §3.2)
- ❌ shadcn/ui aplicado raso — vira AI slop. Pode usar como base, mas customizar fortemente.
- ❌ Three.js / WebGL no hero — overkill, ver §4
- ❌ Lottie pesado em mobile
- ❌ Bootstrap, Material UI

---

## 3. Sistema de Design

### 3.1 Paleta
```css
:root {
  /* Base — paleta editorial quente */
  --background: #0a0a0a;      /* preto suave, não puro */
  --foreground: #f5f4f0;      /* off-white quente */
  --muted: #8a8780;           /* cinza-areia */
  --border: #1f1e1b;
  --surface: #141312;         /* card backgrounds */

  /* Accent único */
  --accent: #c8a96a;          /* dourado quente, sutil */

  /* Estados */
  --success: #6b8e5a;
  --error: #b85c4a;
  --warning: #d4a14a;
}
```
Modo claro: pós-MVP (v1.2+).

### 3.2 Tipografia
- **Display**: Söhne Breit ou PP Editorial New (serif/sans editorial) — via Fontshare se versão paga não couber
- **Body**: Söhne Buch ou Aeonik Pro — alternativa free: Geist Sans
- **Mono**: JetBrains Mono (apenas para SKU codes)
- Escala fluida com `clamp()`, mínimo 16px body, hero até 12rem em desktop

**Free tier path**: Fontshare oferece Söhne-equivalentes gratuitos (Satoshi, Switzer). Geist Sans (Vercel) é alternativa profissional zero-custo.

### 3.3 Espaçamento
- Sistema baseado em 4px (`0.25rem`)
- Padding de seção: `clamp(4rem, 10vw, 12rem)` no eixo Y
- Gutter de grid: `1.5rem` mobile, `2rem` desktop

### 3.4 Motion
- Easing padrão: `cubic-bezier(0.22, 1, 0.36, 1)` (entrada suave)
- Duração padrão: 600-800ms reveals, 200-300ms hover
- TODA animação respeita `prefers-reduced-motion: reduce`

---

## 4. Hero Section — Scroll-driven Product Rotation

### 4.1 Comportamento
- Hero ocupa 100vh inicial
- Tênis aparece centralizado, ângulo lateral 3/4
- Conforme scroll desce nos primeiros 200vh:
  - **Fase 1 (0-100vh)**: tênis rotaciona 360° em torno do eixo Y
  - **Fase 2 (100-200vh)**: tênis cresce 1.0 → 1.4 e desliza levemente pra cima, copy lateral aparece em stagger
- A partir de 200vh, scroll normal pro carrossel (§5)

### 4.2 Implementação técnica
**MUST** usar image sequence scrubbing — não Three.js, não vídeo embedado.

```
/public/hero-sequence/jordan1-001.webp ... jordan1-072.webp
```

- 72 frames em WebP qualidade 80 (~40-60KB cada, ~3-4MB total)
- Pré-carregamento progressivo: primeiros 12 frames eagerly, resto via `requestIdleCallback`
- Mapeamento: `useScroll()` + `useTransform()` do Motion → índice do frame
- Canvas API para `drawImage` (mais performático que swap de `<img>`)
- Mobile: reduzir para 36 frames + bloquear fase 2 (só fade-in simples)

### 4.3 Pipeline de assets — fase provisória (Veo 3)
Enquanto o sócio não entrega renders/fotos definitivos:

1. **Geração Veo 3** com prompt:
   ```
   Studio product shot of an Air Jordan 1 Retro High OG sneaker on a 
   seamless off-white infinity background. Locked overhead camera, no 
   camera movement. The sneaker rotates slowly 360 degrees around its 
   vertical axis, full rotation completed in 8 seconds. Cinematic soft 
   lighting from upper-left, subtle shadow beneath. Photorealistic, 
   no people, no text. 8K, hyper-detailed leather and laces texture.
   ```
2. **Extração de frames** com ffmpeg:
   ```bash
   ffmpeg -i veo3_output.mp4 \
     -vf "fps=9,scale=1200:-1:flags=lanczos" \
     -q:v 2 frames/frame_%03d.webp
   ```
3. **Otimização**:
   ```bash
   for f in frames/*.webp; do
     cwebp -q 80 "$f" -o "public/hero-sequence/$(basename $f)"
   done
   ```
4. **Limitação esperada**: drift de pixel entre frames (modelo de AI não tem coerência 3D verdadeira). Aceitável pra MVP, substituir por renders reais antes do scaling de tráfego pago.

### 4.4 Fallback
- `prefers-reduced-motion: reduce` → frame 18 estático com fade-in
- Conexão `effectiveType` 2g/slow-2g → mesma coisa
- Canvas API falha → fallback pra `<img>` estático
- `loading` state durante carregamento dos primeiros 12 frames

### 4.5 Copy do hero
- H1: máximo 6 palavras, peso máximo, escala display
- Subhead: 1 linha, tom editorial
- CTA primário: "Ver coleção" (não "Comprar agora")
- CTA secundário (link): "Conhecer NEXUS"

---

## 5. Carrossel de Coleção (abaixo do hero)

### 5.1 Comportamento
- Scroll horizontal com `scroll-snap-type: x mandatory`
- Cada card é um produto/SKU
- Parallax sutil: cards se deslocam horizontalmente com scroll vertical
- Hover (desktop): lift 8px, sombra cresce, foto secundária revela com crossfade
- Tap (mobile): abre PDP

### 5.2 Card de produto
- Imagem 4:5 (não quadrada)
- Nome do tênis em display font
- Preço em sans regular (sem bold — premium é discreto)
- Tag de estado em texto pequeno mono uppercase: `NOVO` / `SEMINOVO` / `USADO`
- Tag de tamanho disponível (apenas 1 unidade = mostrar tamanho específico)
- SEM badge "FRETE GRÁTIS" ou "PROMOÇÃO" no card

### 5.3 Quantidade
- 6-8 cards na home
- Link "Ver toda a coleção" no final do trilho → `/colecao`

---

## 6. Página de Produto (PDP)

### 6.1 Layout desktop
- Split 60/40: galeria à esquerda, info à direita (info sticky)
- Galeria com 5-8 fotos do produto: lateral, traseira, sola, palmilha, detalhes de desgaste (se houver)
- Foto principal com zoom em hover (cursor vira lupa)

### 6.2 Layout mobile
- Galeria full-width com swipe horizontal + indicador de página
- Info abaixo em stack
- Botão "Adicionar ao carrinho" fixo no bottom após scroll

### 6.3 Info do produto
- Nome
- Estado (NOVO / SEMINOVO / USADO EM BOM ESTADO) — destacado
- Preço (parcelamento em pequeno abaixo, com info do PIX 10% off)
- Tamanho disponível (geralmente único, não seletor — mostra "TAM 42 BR / 10 US")
- Botão CTA primário "Adicionar à sacola"
- Acordeão expandido por padrão:
  - **Descrição** — narrativa pessoal, origem, contexto de uso
  - **Estado da peça** — descrição honesta de desgaste, fotos de detalhes
  - **Especificações** — marca, modelo, ano de lançamento, colorway oficial
  - **Frete & Devolução** — política
- Seção "Outras peças da coleção" — 3-4 produtos relacionados

### 6.4 Acima da dobra (mobile, até 700px de altura)
- Foto principal
- Nome + estado + preço
- Tamanho
- Botão de compra

---

## 7. Carrinho & Checkout

### 7.1 Carrinho
- Drawer lateral (não página separada)
- Animação: slide right + fade
- Item: thumb 80x80, nome, tamanho, estado, preço, remover (sem quantidade — cada SKU é único)
- Resumo no rodapé: subtotal, frete (calcular via CEP), total
- Badge "10% off no PIX" em destaque

### 7.2 Checkout
- Single-page (não wizard)
- Ordem visual: identificação → endereço → pagamento → revisão
- PIX em destaque (badge "10% off")
- Guest checkout MUST (sem cadastro forçado)
- Validação inline com Zod, mensagens em PT-BR
- Cálculo de frete via Melhor Envio API

### 7.3 Pós-compra
- Tela de obrigado com tracking
- Email transacional (Resend) brandado NEXUS DROP
- Status do pedido em `/pedidos/[id]` (acessível via email + código sem login)

---

## 8. Admin Panel (v1)

Mínimo viável pra operar solo:
- Login (Better-Auth, single admin user)
- Listar / criar / editar / arquivar produtos
- Upload de imagens (drag-drop, geração automática de thumbs via Cloudflare Images)
- Listar pedidos / atualizar status (pago, separação, enviado, entregue, devolvido)
- Dashboard simples: receita do mês, top 5 produtos, ticket médio

**Stack**: rota `/admin/*` com middleware Better-Auth. Tabelas com TanStack Table. Charts com Recharts.

Análises avançadas: fica em Power BI conectado direto ao Neon Postgres via connection string (Paulo já domina).

---

## 9. Performance Budget

| Métrica | Mobile (4G) | Desktop |
|---------|-------------|---------|
| LCP     | < 2.5s      | < 1.8s  |
| INP     | < 200ms     | < 100ms |
| CLS     | < 0.05      | < 0.05  |
| TBT     | < 200ms     | < 100ms |
| Bundle inicial JS | < 180KB | < 220KB |

Hero sequence carrega progressivo, não conta no LCP (LCP é o frame estático inicial).

---

## 10. Acessibilidade

- Contraste WCAG AA mínimo em todos os textos
- Navegação completa por teclado (Tab, Enter, Esc no drawer)
- `prefers-reduced-motion: reduce` desabilita scroll-driven, mantém fades
- `aria-label` em botões de ícone
- Imagens com `alt` descritivo (ex: "Air Jordan 1 Retro High OG colorway Bred vista lateral")
- Skip link pro conteúdo principal

---

## 11. SEO & Metadata

- `metadata` API do Next.js em toda página
- Schema.org Product em PDP (incluindo `offers`, `itemCondition`, `availability`)
- Sitemap dinâmico em `/sitemap.xml`
- Open Graph com imagem dedicada por produto (gerada via `@vercel/og`)
- URLs limpas: `/tenis/[slug]` no formato `air-jordan-1-retro-high-og-bred-42`

---

## 12. Analytics & Eventos

PostHog events mínimos:
- `page_view` (auto)
- `product_view` (PDP)
- `add_to_cart`
- `remove_from_cart`
- `checkout_start`
- `purchase` (com value e items)
- `influencer_click` (UTM tracking pra cada influencer)

Dashboard de funil: home → PDP → cart → checkout → purchase.

Tracking de influencer: cada parceria recebe link UTM próprio (`?utm_source=tiktok&utm_medium=influencer&utm_campaign=nome_do_influencer`) pra atribuir vendas.

---

## 13. Roadmap de Entrega (realista, 2-3h/dia)

### Fase 1 — Fundação (semanas 1-3)
- [ ] Setup Next.js + Tailwind + Motion + TypeScript
- [ ] Design system base (cores, tipo, componentes primitivos)
- [ ] Schema Drizzle (Product, Order, Customer, Address)
- [ ] Conexão Neon Postgres
- [ ] Setup Cloudflare R2 + upload de imagens
- [ ] Layout base + navegação

### Fase 2 — Catálogo (semanas 4-6)
- [ ] Página home estática (sem hero animado ainda — frame único)
- [ ] Carrossel de coleção
- [ ] PDP completa
- [ ] Página `/colecao` com grid

### Fase 3 — Compra (semanas 7-10)
- [ ] Carrinho (Zustand)
- [ ] Integração Mercado Pago (PIX + cartão)
- [ ] Checkout single-page
- [ ] Cálculo de frete Melhor Envio
- [ ] Email transacional Resend
- [ ] Página de pedido

### Fase 4 — Admin (semanas 11-13)
- [ ] Better-Auth setup
- [ ] CRUD de produto
- [ ] Listagem de pedidos
- [ ] Dashboard básico

### Fase 5 — Polish (semanas 14-16)
- [ ] Hero com scroll-driven sequence scrubbing (assets Veo 3)
- [ ] Parallax no carrossel
- [ ] Microinterações
- [ ] Schema.org / SEO completo
- [ ] PostHog + Vercel Analytics
- [ ] Sentry
- [ ] Testes em devices reais

### Fase 6 — Pré-launch (semana 17)
- [ ] Domínio próprio configurado
- [ ] Política de privacidade + Termos
- [ ] LGPD: banner de cookies + página de tratamento
- [ ] Conteúdo (copy + fotos) do sócio integrado
- [ ] Soft launch para amigos
- [ ] Ajustes finais

**MVP em ~17 semanas (4 meses) com 2-3h/dia.**

### Pós-MVP
- v1.1: hero com renders/fotos reais do sócio (substitui Veo 3)
- v1.2: modo claro, wishlist, cupom de desconto
- v1.3: integração ERP (Bling ou Tiny)
- v2.0: clube de assinatura / drops cronometrados (se fizer sentido comercial)

---

## 14. Decisões Fechadas (substitui D1-D6 da v1)

| # | Decisão | Resolução |
|---|---------|-----------|
| D1 | CMS produto | Postgres direto via Drizzle |
| D2 | Auth | Better-Auth (open source, free) |
| D3 | Gateway | Mercado Pago (PIX + cartão até 3x sem juros) |
| D4 | Nome | NEXUS DROP |
| D5 | Modo claro | v1.2+ pós-MVP |
| D6 | Renders | Veo 3 provisório → sócio entrega definitivos pós-MVP |
| D7 | Domínio | Validar `nexusdrop.com.br` no registro.br |
| D8 | CNAE / fiscal | 4782-2/01 (calçados) — validar com contador |

---

## 15. Riscos Conhecidos & Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Drift visual nos frames Veo 3 | Alta | Médio | Aceitar no MVP, substituir antes de tráfego pago |
| Estoque finito limita escala | Certa | Médio | É feature, não bug — comunicar escassez como valor |
| Mercado Pago suspender conta por venda de marca registrada | Baixa | Alto | Documentar autenticidade (nota original, foto da etiqueta) pra eventual contestação |
| Influencer marketing sem ROI | Média | Médio | Tracking UTM rigoroso, parar parcerias sem conversão em 30 dias |
| 4 meses sem launch → desânimo | Média | Alto | Soft launch em fase 5 mesmo sem hero animado pronto |

---

## 16. Glossário

- **PDP**: Product Detail Page
- **SKU**: Stock Keeping Unit
- **Hero**: primeira seção da home, full-viewport
- **Scrubbing**: técnica de controlar mídia via input externo (scroll)
- **Drop**: lançamento de coleção / unidade limitada
- **RSC**: React Server Components
- **CLS/LCP/INP**: Core Web Vitals
- **CDC**: Código de Defesa do Consumidor
- **LGPD**: Lei Geral de Proteção de Dados
