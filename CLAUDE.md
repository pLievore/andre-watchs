# CLAUDE.md — ANDRE WATCHES

## 👉 Comece por aqui

**Leia [`docs/ESTADO.md`](docs/ESTADO.md) antes de qualquer coisa.** Ele diz em
uma página o que já existe, o que não existe e qual é a fase atual. É o único
documento que muda a cada entrega — se ele discordar de outro arquivo, ele está
certo e o outro está velho.

| Arquivo | O que responde |
|---|---|
| [docs/ESTADO.md](docs/ESTADO.md) | onde estamos, o que falta |
| **CLAUDE.md** *(este)* | como trabalhar neste repo |
| [SPEC.md](SPEC.md) | o que o produto é e por quê |
| [PLANO-CLUBE.md](PLANO-CLUBE.md) | o plano da fase contratada |
| [docs/FASE-1.md](docs/FASE-1.md) | passo a passo da fase atual |
| [docs/BANCO.md](docs/BANCO.md) | esquema, RLS, as duas chaves |

Especialistas invocáveis vivem em `.claude/agents/` (ver o README de lá).

## Escopo atual

O site está virando **acervo privado**: catálogo atrás de login, painel para o
dono. Ver [PLANO-CLUBE.md](PLANO-CLUBE.md).

Sem gateway de pagamento por decisão — a venda fecha no WhatsApp, centralizado
em `src/components/contact/WhatsappCta.tsx`, **ponto único de verdade** do canal.

## Banco de dados

**Supabase** (Postgres + auth + RLS). Detalhes em [docs/BANCO.md](docs/BANCO.md).

- Toda leitura passa por `src/lib/db/pecas.ts` — **a única fronteira de tradução**
  entre o banco (português) e os componentes (o tipo `Watch`). Se um componente
  precisar mudar de assinatura por causa do banco, o mapeamento é que está errado.
- `src/lib/db/client.ts` é o padrão (chave anon, respeita RLS).
- `src/lib/db/admin.ts` ignora RLS. Abre com `import "server-only"` — arquivo com
  `"use client"` que o importar **quebra o build**, que é o objetivo. Nunca remova
  essa linha.
- **RLS ligado em toda tabela nova, desde o primeiro dia.** Ligar depois obriga a
  auditar cada consulta já escrita.
- Migração nova vira arquivo em `supabase/`, idempotente, aplicada com
  `node scripts/aplicar-sql.mjs supabase/<arquivo>.sql`. Registre na tabela do
  topo de [docs/BANCO.md](docs/BANCO.md).

## Duas portas, nunca uma

- **`/acesso` é do cliente. `/painel/entrar` é da casa.** Não são a mesma tela
  com um `if` dentro: o login de cliente ainda precisa checar
  `clientes.status`, e o do admin nunca olha `clientes` — o dono não é cliente
  da própria casa.
- A porta do cliente **recusa e-mail de admin antes de autenticar**. Conferir a
  senha primeiro faria a tela responder diferente para senha certa e errada, e
  ela viraria um oráculo para descobrir qual conta administra o site.
- `/painel/entrar` fica dentro de `/painel` para o endereço dizer a que área
  pertence, e por isso é excluída à mão da proteção de prefixo no middleware
  (`PORTA_ADMIN`) — senão exigiria a sessão que existe para ser criada ali.
- Rota nova do painel entra sob `painel/(interno)/`, que é onde vive o guard.
  Coisa colocada em `painel/` direto **nasce sem proteção**.
- Cliente autenticado que tenta `/painel` vai para `/acervo`, não para a porta
  do admin: ali ele nunca entraria, e a tela sugeriria que é só achar a senha.
- Conta do admin é `/painel/conta` — nunca `/acervo/conta`, que exige
  `clientes.status = 'ativo'` e recusaria o dono.
- **O dono navega o acervo.** Ele não tem linha em `clientes`, então a regra de
  cliente ativo o expulsava e ele acabava teleportado ao painel — não conseguia
  ver a própria loja. A leitura dele passa pela chave secret
  (`leitorDoAcervo` em `pecas-sessao.ts`); o RLS não afrouxa por causa disso.
  A `BarraPrevia` avisa que é a visão da casa, e a visita dele **não** conta
  como acesso de cliente.
- Menu do site tem três formas: visitante, cliente, dono. Link que não serve ao
  papel de quem está logado é beco sem saída, não conveniência.
- No mobile, **cliente ativo usa a barra inferior** de
  `ClienteNavMobile.tsx`; visitante e dono continuam com o menu do Header. A
  barra tem Acervo, Vender, A casa e Conta, e o layout reserva espaço depois do
  rodapé para ela não cobrir conteúdo.

## Clientes: a identidade mora em dois lugares

- `auth.users` guarda **e-mail e senha** (o login usa isso); `clientes` guarda
  nome, telefone, status e observação. **Toda escrita de e-mail vai nos dois** —
  gravar só na tabela deixa a pessoa entrando com o e-mail antigo enquanto o
  painel mostra o novo, e o descompasso só aparece quando alguém não entra.
- Trocar e-mail escreve no Auth **primeiro**: se falhar (e-mail em uso), a
  tabela não chega a divergir.
- Criar cliente que falhe ao gravar a linha **apaga o usuário do Auth**. Conta
  sem linha em `clientes` é órfã: entra no login e não passa em checagem
  nenhuma.
- São **quatro** status, não dois. `recusado` e `inativo` barram igual, mas um
  é "não quisemos" e o outro é "não é mais" — a distinção é do negócio.
- Excluir cliente é para cadastro errado e pedido de LGPD. Para quem parou de
  comprar existe `inativo`, que preserva o histórico.

## Peças: estado e fotos

- **O estado comercial é `estado`** (enum: `disponivel`, `reservada`,
  `vendida`), não `disponivel`. O booleano ainda existe, derivado por trigger,
  só para não quebrar consulta antiga — **nunca escreva nele**.
  `Watch.available` é açúcar para `state === "disponivel"`.
- Os três estados aparecem para o cliente: disponível segue com CTA, **em
  negociação ganha selo e continua à venda** (esconder afastaria o segundo
  interessado), vendida vira registro do que passou pela casa.
- **O bucket `pecas` é privado.** Foto com URL pública fura o clube inteiro —
  bastaria compartilhar o endereço da imagem. Toda foto vira link assinado por
  `src/lib/db/fotos.ts`; nunca troque por `getPublicUrl`.
- Há dois formatos válidos de URL: legado local começa por `/pecas/`; upload do
  bucket é `slug/uuid.ext`, sem barra inicial. `fotos.ts` só assina o segundo —
  tratar todo caminho relativo como Storage faz as 18 fotos locais sumirem.
- **`on delete cascade` não apaga arquivo do Storage.** Quem exclui peça ou
  foto remove os objetos do bucket na mesma operação, senão sobra imagem órfã
  que nenhuma tela alcança.
- `ordem = 0` é a capa do card, `1` é o crossfade do hover, o resto é galeria.
  A constraint `fotos_ordem_unica` é deferrable. A troca acontece na função
  transacional `mover_foto` (`fase-5.sql`), com lock por peça; não recrie a
  sequência de três updates nem use uma ordem temporária `-1`.
- Os bytes de upload **não passam por Server Action** (limite padrão de 1 MB do
  Next). Cadastro e edição usam o mesmo fluxo: ação autenticada assina os
  caminhos, o navegador envia ao bucket e outra ação confirma e registra.
- **Toda foto tem três formas** desde a fase 13: original (visualizador),
  miniatura de 1000px em `url_thumb` (card, lista, quadro da PDP) e um
  desfoque de 20px embutido em `blur`. As três nascem no navegador, antes do
  envio — o servidor continua sem receber imagem. Foto antiga sem miniatura
  cai na original sozinha; não espalhe condicional pelos componentes.
- Quem apaga foto ou peça remove **os dois** objetos do bucket (original e
  miniatura), e a faxina de órfãos conta `url_thumb` como registrado — senão
  ela apaga toda miniatura com mais de duas horas.

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
- **Nunca** chamar o acervo de "pequeno" (mesmo querendo dizer seletivo) — soa a
  falta de estoque, não a curadoria, e tira credibilidade. Prefira "a casa só
  anuncia o que conhece" / "escolhido a dedo".

## Retorno tátil (haptics)

- `src/lib/haptics.ts` é o ponto único de disparo. Android usa
  `navigator.vibrate`; no iPhone **não existe API de vibração** — o caminho é
  o switch nativo `<input type="checkbox" switch>` (Safari 17.4+).
- **A regra muda com a versão do iOS.** Até o **26.4**, `label.click()` por
  código alterna o switch e vibra: é o `GatilhoTatil` montado nos dois layouts
  raiz, e é o que faz o deslize entre abas vibrar. Do **26.5** em diante a
  Apple passou a exigir evento confiável — nenhum clique sintético vibra
  (`isTrusted` não é forjável por script), e só o toque físico em controle
  nativo aciona a Taptic Engine.
- Por isso os botões da barra de navegação têm um switch transparente
  sobreposto: ali o dedo toca o controle de verdade e vibra em qualquer versão.
- **Arrastar também conta como manipulação física.** Medido em iOS 26.6:
  arrastar o switch (não só tocá-lo) dispara o tique. É o que permitiu a barra
  inferior virar superfície de arrasto — `data-swipe-nav` no `<nav>`,
  `data-tab-index` em cada botão, e o shell deixa o gesto começar ali. Trocar
  de aba arrastando pela barra vibra; deslizar sobre o **conteúdo** continua
  mudo no iPhone, porque ali não existe controle nativo sob o dedo.
- ⚠️ No gesto que começa na barra, **não** chame `preventDefault` no
  `touchmove`: o gesto pertence ao controle nativo, e cancelá-lo tira o tique.
- ⚠️ **Switch desligado só vibra indo para a direita.** Ele só tem um
  movimento possível — ligar. Para a esquerda não muda de estado, e sem
  mudança de estado não há tique. Por isso o shell arma o `.checked` do switch
  sob o dedo no primeiro movimento, quando a direção já é conhecida (escrever
  `.checked` por código não dispara evento, então não mexe na navegação).
- O clique tem de passar pelo **label**. Clicar o input por código não dispara
  o tique nem nas versões antigas.
- Regra prática para qualquer ideia nova de haptics no iPhone: só vibra o que
  tem dedo em cima de controle nativo. Se a ideia depende de evento sintético,
  já foi testada e não funciona.
- Quem vibra na troca de aba é o handler de travessia do shell
  (`SiteTabShell`/`PainelTabShell`), um ponto só. Não acrescente vibração
  também no clique do menu — dá buzz duplo no mesmo gesto.

## Comandos

- Dev: `npm run dev` · Typecheck: `npx tsc --noEmit` · Lint: `npm run lint`
- Migração nova: aplique com `node scripts/aplicar-sql.mjs` e **regenere os
  tipos** com `node scripts/gerar-tipos-banco.mjs`. Os três clientes do
  Supabase carregam esse tipo, e `any` é erro de lint — foi o `any` que
  escondeu um filtro por coluna inexistente no painel.
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
- **Texto SOBRE o vídeo, protegido por scrim adaptativo.** A luminância da
  metade inferior varia de 11 a 208 ao longo da sequência, então scrim de
  opacidade fixa não serve: o que segura o claro afunda o escuro em breu. O
  scrim lê `src/lib/hero-luma.ts` (tabela por quadro, gerada offline por
  `scripts/build-luminance.mjs`) e ajusta a própria opacidade pra deixar sempre
  a mesma base sob o texto.
- **A copy tem sombra própria, e é ela que deixa o scrim global ser leve.** Uma
  elipse suave atrás da frase escurece só onde o texto está, em vez de rebaixar
  a base inteira. Foi o que permitiu subir o alvo de luminância de 42 para 58 —
  média do scrim de 0,58 para 0,44, quase um quarto menos véu na tela.
- **Nunca medir luminância em runtime.** `getImageData` força leitura de volta
  da GPU e trava o pipeline no meio do scroll. Se trocar a sequência, rode
  `node scripts/build-luminance.mjs` pra regerar a tabela.
- **Toda a coreografia lê a mola `progress`, nunca o `scrollYProgress` cru.**
  É o que dá a inércia (D12). Ligar um transform direto no scroll faz aquele
  elemento congelar enquanto o resto desliza.
- Frames em `/public/hero-sequence/aw-hero-NNN.webp` (361 arquivos, **1920px**, 30,5 MB
  — 30fps, resolução nativa da fonte, q88). Pipeline:
  `ffmpeg -i fonte.mp4 -vf "fps=30,scale=1920:-2" -c:v libwebp -quality 88 -f image2 out/f_%03d.webp`
- **Não economize na qualidade do WebP.** q68 economizava 13 MB e produzia
  macrobloco visível no mostrador escuro — "dá pra ver cada pixel". q88 é o
  patamar em que o artefato some neste material.
- **`imageSmoothingQuality = "high"` no contexto do canvas.** O padrão é "low", e
  em toda janela cuja proporção difere de 16:9 o canvas reamostra — com o filtro
  barato, isso serrilha. É grátis e resolve metade da queixa de nitidez.
- **Extraia sempre na resolução da fonte.** Medido: 1920 q68 e 1440 q82 pesam o
  mesmo, e o 1920 é visivelmente mais nítido — nitidez vem mais de pixel do que
  de bitrate. Escalar a fonte para baixo e compensar com qualidade é troca ruim.
- O canvas nunca aloca mais pixels do que a fonte tem (`SOURCE_WIDTH`). Cap fixo
  de DPR erra dos dois lados: desperdiça em tela grande e perde nitidez em tela
  pequena de DPR alto.
  (o `-f image2` é obrigatório — sem ele o ffmpeg gera um WebP animado único).
- **Scrubbing é só desktop.** No mobile o hero tem UMA tela de altura e toca
  `/public/hero-mobile.mp4` em loop. Scrubbing exige 250vh de hero, e no celular
  isso vira parede: o polegar rola e a página não sai do lugar.
- O vídeo do mobile é **boomerang**: 12s de ida + 12s de volta no mesmo arquivo
  (24s, 6,7 MB). Corte seco de volta ao início denuncia o loop; ida e volta não
  tem emenda. `playbackRate = -1` não serve — o iOS não suporta. Pipeline:
  `ffmpeg -i fonte.mp4 -an -filter_complex "[0:v]trim=start_frame=1,setpts=PTS-STARTPTS[fwd];[0:v]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[rev];[fwd][rev]concat=n=2:v=1[out]" -map "[out]" -c:v libx264 -crf 22 -movflags +faststart`
  (o `trim=start_frame=1` nos dois lados evita quadro repetido na virada e no
  emendo do loop).
- É também um **recorte 3:4** da fonte (810×1080). Em retrato o
  `object-cover` descarta as laterais de um 16:9 — entregar o quadro cheio é
  pagar banda por pixel que ninguém vê.
- **Se trocar o vídeo do mobile, rode `node scripts/build-luminance.mjs`.** A
  tabela do mobile é medida a partir do vídeo JÁ RECORTADO, porque o scrim
  precisa descrever o que está na tela: medir a fonte 16:9 deu 11–207, o
  recorte real dá 13–239.
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
