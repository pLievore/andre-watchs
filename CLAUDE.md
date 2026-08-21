# CLAUDE.md — ANDRE WATCHES

Fonte da verdade do produto/escopo é o **SPEC.md**. Este arquivo cobre só as
**regras de execução** que não devem ser adivinhadas.

Especialistas invocáveis vivem em `.claude/agents/` (ver o README de lá).

## Escopo atual

**Front-end apenas** (SPEC §14 D5). Sem DB, sem gateway, sem checkout.
Conversão = preço visível + CTA de WhatsApp, centralizado em
`src/components/contact/WhatsappCta.tsx` — **ponto único de verdade** do canal.
Ecommerce é fase E.

## Stack (travada — ver SPEC §2.1)

- **Next.js 15** (App Router, RSC) + **TypeScript strict** + **Tailwind v4** (CSS vars)
- **Animação/movimento: Motion (motion.dev)** — `motion/react`. NÃO usar GSAP nem
  Framer Motion legado. NÃO instalar ScrollTrigger.
- **Scroll suave: Lenis** (`lenis/react`, via `SmoothScroll` no layout). Lenis dirige
  o scroll real, então `useScroll`/`useTransform` do Motion funcionam sem fiação extra.
- Imagens: `next/image` (locais em `/public`). Vídeo: `<video>` nativo.

## Regras de animação (cinematográfico com intenção)

1. **Movimento = Motion.** Scroll-driven via `useScroll` + `useTransform`. Reveal
   pontual via `whileInView` (`viewport={{ once: true }}`).
2. **Scroll = Lenis.** Já montado globalmente. Não reinventar smooth-scroll.
3. **Duração de entrada/saída ≥ 0.6s** (alvo 0.8–1.0s pra reveals grandes). Micro-hover
   (200–300ms) é exceção (SPEC §3.4).
4. **Easing = editorial.** Use a var `--ease-editorial` (`cubic-bezier(0.22,1,0.36,1)`)
   em CSS, ou o tuple `[0.22, 1, 0.36, 1]` no Motion. Não usar `ease: "linear"` em
   reveals (só em loops contínuos, ex.: orbital do CTA de fechamento).
5. **Stagger ~0.1–0.2s** entre itens de uma sequência.
6. **Zero bounce.** Relógio não quica — nada de spring elástico ou overshoot.
   Springs são permitidos e desejáveis para dar inércia (ver `COAST` no
   `HeroBand`), mas sempre **superamortecidos** (ζ = damping / (2·√(stiffness·mass)) > 1).
7. **Scroll tem inércia.** Coreografia scroll-driven passa por mola antes de
   virar transform — parar de rolar desacelera, não congela (SPEC §14 D12).
8. **TODA animação respeita `prefers-reduced-motion`** (SPEC §3.4/§9).
9. **Performance**: `will-change-transform` em elementos animados por scroll;
   `overflow-hidden` na seção quando houver translate negativo. Animar só
   `transform` e `opacity`.

## Tokens e vocabulário visual (SPEC §3)

- **Identidade é claro editorial**: papel osso (`#faf8f4`), tinta (`#17181a`),
  serifa. Referência é catálogo de leilão, não vitrine de revenda.
- Cores sempre via `var(--color-*)`. **Nunca hex solto em componente.** O acento
  é a própria tinta; `--color-accent-soft` é pátina e **não serve para texto**
  (não passa AA); `--color-accent-gold` é restrito a peças two-tone/ouro.
- **Ouro é o único texto colorido do site, e só no palco** (`.on-stage .eyebrow`,
  8.4:1). Sobre papel o ouro marca 3.66:1 e reprova AA; em tamanho display ele
  lê como joalheria de esquina. Título do hero é off-white, títulos de papel são
  tinta.
- **Proibido**: mono maiúsculo com tracking largo (era o tique do NEXUS DROP),
  fundo escuro, glow, sombra preta densa, efeitos de partícula.
- **Use as classes de `globals.css`, não estilo inline**: `.eyebrow` (serifa
  itálica), `.label` (rótulo de UI), `.meta` (dado técnico em mono, sem
  tracking), `.prose-editorial`, `.display`, `.btn` + `.btn-primary`/`.btn-ghost`,
  `.link-quiet`. Se falta um vocábulo, adicione a classe — não repita inline.
- **Onde houver footage, use `.on-stage`.** O site é papel, mas vídeo pede fundo
  escuro: a footage tem luminância ~145 contra 248 do papel, e encostar as duas
  cria emenda dura que lê como retângulo colado. `.on-stage` redefine os tokens
  no escopo, então `.eyebrow`, `.label`, `.btn-primary` etc. se invertem
  sozinhos. **Nunca criar variantes `-invert` de componente.**
- Uma seção de palco marca-se com `data-stage-hero`. O `Header` procura esse
  atributo pra saber quando virar papel — rota sem palco já começa clara. Se
  criar outra seção escura no topo de uma página, marque-a assim.
- Sombra no claro é curta e de tinta (`rgba(23,24,26,0.3)` no máximo). Sombra
  preta densa suja o papel.

## Regras de conteúdo (não são estilo — são risco)

- **Nunca** escrever ou sugerir que a casa é revendedora autorizada de qualquer
  maison. O disclaimer do rodapé é obrigatório em toda página (SPEC §1.4).
- **Nunca** inventar referência, calibre, ano ou procedência. Sem dado confirmado,
  a UI mostra `—` (helper `specValue` em `src/lib/types.ts`).
- **Nunca** apresentar render de IA como peça real à venda (SPEC §4.3).
- ⚠️ `/public/pecas/*` são fotos do **Unsplash**, para demonstração ao cliente —
  não são peças da casa. Cobrem catálogo, PDP, `/sobre`, os três pilares do
  `EthosBand` e o orbital do `ClosingCta`. Estão marcadas no topo de `src/lib/data/watches.ts` e
  **bloqueiam publicação** até as fotos reais entrarem (SPEC §14 D8).
- Proibido badge de promoção, countdown, "últimas unidades". Escassez é fato:
  "1 unidade" é informação, urgência fabricada não.

## Comandos

- Dev: `npm run dev` · Typecheck: `npx tsc --noEmit`
- ⚠️ `next build` **falha localmente no Node 25** (`/_not-found` prerender). A Vercel
  builda no Node 22 e passa. Use `npx tsc --noEmit` pra validar localmente.
- Deploy: `npx vercel --prod` (projeto já linkado).

## Vídeo ambiente

- `src/components/media/AmbientVideo.tsx` é o componente único para loop
  decorativo (`preload="none"` + IntersectionObserver + fallback de poster no
  reduced-motion). Não criar variações — estender esse.
- **Nunca colocar texto por cima de vídeo** neste projeto. Material de macro tem
  luminância imprevisível e a copy some em metade da duração (SPEC §14 D11).
- Em uso: `/public/oficio.mp4` (retrato, painel do `/sobre`).

## Hero (SPEC §4)

- **`src/components/hero/HeroBand.tsx` é o hero em produção.** Faixa cinemascope
  que abre até sangria total com o scroll, texto nas margens pretas, e 120
  frames WebP dirigidos pelo scroll via canvas 2D.
- **Texto nunca sobre o vídeo.** Não é estética: a luminância do material
  alterna entre setups claros e escuros (77% de pixels claros aos 1s, 12% aos
  5s), então copy sobreposta fica ilegível em metade da duração (SPEC §14 D11).
- **Toda a coreografia lê a mola `progress`, nunca o `scrollYProgress` cru.**
  É o que dá a inércia (D12). Ligar um transform direto no scroll faz aquele
  elemento congelar enquanto o resto desliza.
- Frames em `/public/hero-sequence/aw-hero-NNN.webp` (361 arquivos, **1920px**,
  17,2 MB — 30fps, resolução nativa da fonte). Pipeline:
  `ffmpeg -i fonte.mp4 -vf "fps=30,scale=1920:-2" -c:v libwebp -quality 68 -f image2 out/f_%03d.webp`
- **Extraia sempre na resolução da fonte.** Medido: 1920 q68 e 1440 q82 pesam o
  mesmo, e o 1920 é visivelmente mais nítido — nitidez vem mais de pixel do que
  de bitrate. Escalar a fonte para baixo e compensar com qualidade é troca ruim.
- O canvas nunca aloca mais pixels do que a fonte tem (`SOURCE_WIDTH`). Cap fixo
  de DPR erra dos dois lados: desperdiça em tela grande e perde nitidez em tela
  pequena de DPR alto.
  (o `-f image2` é obrigatório — sem ele o ffmpeg gera um WebP animado único).
- **Mobile também é scrubbing**, com sequência própria: 181 frames a 900px em
  `/public/hero-sequence-mobile/aw-m-NNN.webp` (3,6 MB, 15fps). Nunca aponte o
  mobile pro asset de desktop — 361 bitmaps a 1920px passam de 3 GB decodificados.
- **A janela deslizante do mobile não é otimização, é o que viabiliza.** Só
  ficam em memória ~31 quadros em volta do atual; o resto é descartado e
  recarregado do cache de HTTP quando volta. Teto fixo em ~54 MB, contra os
  330 MB que a sequência inteira ocuparia — acima do que o iOS Safari tolera
  antes de matar a aba. Ver `WINDOW_AHEAD`/`WINDOW_BEHIND` no HeroBand.
- **Carga em densidade progressiva** (`DENSITY_PASSES` no HeroBand): arranque
  denso, depois um esqueleto ralo cobrindo a sequência INTEIRA, depois passadas
  que dobram a densidade. Carregar em ordem sequencial deixa a segunda metade
  do scroll vazia por dezenas de segundos — não faça isso.
- Frames passam por `await img.decode()` antes de entrar em memória. Com só
  `onload`, a decodificação cai dentro do primeiro `drawImage`, na main thread,
  durante o scroll — é a causa do engasgo tipo "lag de jogo".
- Cada lote de download é reordenado pela distância ao frame ATUAL: o download
  persegue o usuário em vez de seguir a ordem dos arquivos. Sem isso, quem rola
  até o fim espera o carregamento chegar lá.
- **O canvas dissolve entre frames vizinhos, não escolha um.** O hero consome
  ~1620px de scroll para 361 frames: ~4,5px por frame. Arredondar o índice faz
  o scroll lento atravessar vários pixels sem mudar nada e depois saltar — o
  degrau lê como travamento. O `paint` usa índice fracionário e mistura o
  vizinho com `globalAlpha`, só quando está entre frames E devagar
  (`BLEND_SPEED_LIMIT`); em scroll rápido o segundo `drawImage` seria desperdício.
- **A faixa abre por `translateY` de duas barras sólidas, não por `clip-path`.**
  `inset()` animado repinta a camada recortada a cada quadro, e isso rodava
  exatamente no trecho 0–45% do scroll — era a causa do travamento no início.
- Se um dia existir uma sequência de **take único com câmera travada**, ela entra
  no próprio `HeroBand` (só trocar os arquivos e `FRAME_COUNT`). O antigo
  `HeroSequence.tsx` foi removido: era código morto apontando para um asset que
  já não existe. Está no histórico, no commit `dadbf90`.
- `scripts/scan-angle-match.mjs` acha trechos de jitter numa sequência de take
  único, se vier a ser necessário.
