# PLANO — Andre Watches como acervo privado

> **Status**: aprovado e pago. Este documento é o plano de execução da fase
> contratada; o **SPEC.md** continua sendo a fonte da verdade de produto.
> **Criado**: 2026-08-24

---

## 1. O que muda no produto

O site deixa de ser vitrine e vira **clube fechado**. Isso não é um recurso a
mais — é uma inversão da premissa: hoje tudo é público, e passa a ser tudo
privado, com exceção de uma porta de entrada.

| | antes | agora |
|---|---|---|
| Home | hero + vitrine + acervo | **landing institucional**, sem nenhuma peça |
| Acervo | público | **só para quem entrou** |
| Peça (PDP) | pública | **só para quem entrou** |
| Preço | visível | **só para quem entrou** |
| Quem entra | qualquer um | **quem o Andre autorizou** |

E é coerente com o negócio: peça de R$ 200 mil não se anuncia para a internet
aberta, se mostra para quem foi convidado. A privacidade **é** o luxo aqui.

### Consequência boa e não óbvia

Com todo acesso identificado, o funil deixa de ser anônimo. Sai de "43 pessoas
viram o Daytona" para **"o João abriu o Daytona três vezes essa semana"**. Isso
não é analytics, é lista de prospecção — e é a parte do painel que mais vale
dinheiro para ele.

---

## 2. Banco: Supabase

**Recomendação: Supabase.** O motivo não é o banco em si — é que o produto
inteiro agora depende de *quem é você*, e autenticação feita do zero seria o
pedaço mais caro e mais arriscado da entrega (sessão, cookie seguro, hash de
senha, recuperação).

- **Postgres de verdade** por trás. Se um dia crescer, não há migração traumática.
- **Auth pronta**, incluindo sessão e cookie seguro no lado do servidor.
- **Row Level Security**: o acervo fica protegido **no banco**, não só na
  aplicação. Se alguém achar um endpoint esquecido, o banco ainda nega. Para um
  acervo privado isso não é luxo, é a diferença entre uma falha e um vazamento.
- **Storage** incluso para as fotos das peças, sem contratar outro serviço.
- Free tier folgado no volume dele.

Neon é ótimo banco mas deixa a auth por sua conta. Turso é menor e mais simples,
mesmo problema, e sem RLS.

---

## 3. Autenticação — decisões e o risco registrado

### Como fica (D24)

E-mail e senha. **A senha inicial é o telefone do cliente**, e ele não é
obrigado a trocar. O Andre entrega assim: *"seu acesso é seu e-mail, sua senha é
seu telefone."*

### O risco, registrado uma vez

**Telefone não é segredo.** Está no Instagram, no contato de quem já negociou,
em lista de transmissão. Quem souber o e-mail e o telefone de um cliente entra
na conta dele e vê o acervo inteiro com preços. A base é pequena e os clientes
são identificáveis, o que aumenta o alcance de um vazamento.

Decisão do dono do projeto, tomada com o risco à vista. **Mitigação disponível a
qualquer momento, sem refazer nada**: uma tela de "crie sua senha" no primeiro
login. É aditiva — quando quiser ligar, liga.

### O que fica protegido de todo jeito

- Senha guardada com hash (responsabilidade do Supabase Auth, nunca em texto)
- Limite de tentativas de login, contra força bruta
- Sessão em cookie `httpOnly`, fora do alcance de script
- RLS: mesmo autenticado, o cliente só lê o que lhe é permitido

---

## 4. Três caminhos de entrada (D25)

Os três se complementam, cada um cobre um caso:

**1. Cadastro direto pelo Andre** — ele adiciona nome, e-mail e telefone no
painel. É o caminho de quem já é cliente da casa. Nasce ativo.

**2. Pedido de acesso** — a landing tem um formulário curto. O pedido cai numa
fila de pendentes no painel; o Andre aprova ou recusa. É a porta para
desconhecido, e a lista de recusados também é informação.

**3. Convite por link** — o Andre gera um link e manda no WhatsApp. Quem abre se
cadastra sozinho. **Uso único e validade de 7 dias**, senão o link é repassado e
o clube fura.

---

## 5. Arquitetura

### Rotas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Landing institucional. A casa, o ofício, o convite. **Nenhuma peça.** |
| `/acesso` | público | Entrar. E pedir acesso. |
| `/convite/[token]` | público | Cadastro por convite |
| `/acervo` | **privado** | Saudação + grid de peças |
| `/acervo/[slug]` | **privado** | A peça |
| `/vender` | público | Compra, troca e consignação — não expõe acervo |
| `/painel` | **admin** | Peças, clientes, funil |

A proteção é feita em **middleware**, não em cada página. Rota nova nasce
protegida por padrão; esquecer de proteger deixa de ser possível.

### Tabelas

```
clientes        id, nome, email, telefone, status, criado_em, ultimo_acesso
                status: ativo | pendente | recusado | inativo

pecas           (o tipo Watch de hoje, agora no banco)
                + criado_em, atualizado_em

fotos           id, peca_id, url, alt, ordem

convites        token, criado_por, expira_em, usado_em, cliente_id

eventos         id, cliente_id, tipo, peca_id, criado_em
                tipo: acesso | viu_peca | foi_whatsapp

interesses      id, cliente_id, peca_id, status, criado_em, atualizado_em
                status: em_conversa | negociando | vendido | perdido
```

**Sobre `eventos`**: é a única tabela que cresce sozinha. Nasce com uma rotina
de agregação diária — evento cru guardado para sempre enche free tier muito
antes do catálogo.

### O que se aproveita do que já existe

Praticamente tudo. `Watch`, `WatchCard`, `WatchGallery`, `CollectionGrid`,
`WhatsappCta`, o sistema de design inteiro, o hero. O tipo `Watch` foi escrito
desde o começo com a forma que o banco devolveria — a troca de mock por Postgres
não altera assinatura de componente nenhum.

O que **sai da home**: `WatchShowcase` e `ClosingCta` com peças. A home passa a
ser institucional.

---

## 6. A saudação de boas-vindas (D26)

**Repositório escrito à mão**, 40 a 60 frases no vocabulário da casa, sorteadas
com variação por contexto. Sem IA em runtime: custo zero, latência zero, e
nenhuma chance de sair uma frase fora de tom num site que vende peça de
R$ 200 mil sem ninguém ter revisado.

O contexto é o que faz parecer atenção pessoal em vez de sorteio:

| contexto | exemplo de tom |
|---|---|
| primeira visita | "Bem-vindo, {nome}. O acervo abaixo é o que a casa tem hoje." |
| peça nova desde o último acesso | "{nome}, entraram duas peças desde sua última visita." |
| cliente que sumiu | "Faz um tempo, {nome}. O acervo mudou." |
| madrugada | "Boa madrugada, {nome}." |
| manhã / tarde / noite | variações de saudação |
| já demonstrou interesse | "{nome}, o Submariner que você olhou continua aqui." |

Regra de tom: **discreto, nunca efusivo.** Nada de exclamação, nada de
"incrível", nada de emoji. A frase deve soar como um vendedor experiente
recebendo alguém que ele conhece — não como notificação de aplicativo.

---

## 7. Painel do Andre

**Peças** — criar, editar, arquivar. Upload de foto com processamento
automático (recorte 4:5, WebP, tamanhos), como já combinado. Marcar
disponível / vendida / consignada.

**Clientes** — lista com nome, e-mail, telefone, último acesso. Fila de
pendentes para aprovar ou recusar. Gerar convite. Desativar acesso.

**Funil** — acessos por período, peças mais vistas, idas ao WhatsApp. E o que
importa: **quem viu o quê**. Cada peça mostra quem a abriu; cada cliente mostra
o que anda olhando.

**Interesses** — cada ida ao WhatsApp vira um registro que ele move entre em
conversa, negociando, vendido e perdido. É o que transforma o funil em taxa de
fechamento real.

---

## 8. Sequência de execução

A ordem é deliberada: cada fase deixa o site **funcionando**, nunca quebrado no
meio.

**Fase 1 — Fundação**
Supabase, tabelas, RLS. Migrar o catálogo mock para o banco. O site continua
público e igual, mas lendo do banco. Nada visível muda.

**Fase 2 — Porta**
Auth, middleware, `/acesso`. `/acervo` e `/acervo/[slug]` protegidos. A home
vira institucional. **Aqui o produto muda de fato.**

**Fase 3 — Painel**
CRUD de peças com upload, gestão de clientes, os três caminhos de entrada.
O Andre passa a ser autônomo.

**Fase 4 — Inteligência**
Eventos, funil, interesses. Saudação de boas-vindas.

**Fase 5 — Acabamento**
Mobile em primeiro lugar (a maioria do acesso), estados vazios, o que acontece
quando o cliente erra a senha, quando o convite expirou, quando o acervo está
vazio. Auditoria de acessibilidade e desempenho.

---

## 9. Como o site continua premium

O sistema de design não muda — papel, tinta, serifa, o palco escuro no hero.
O que a área privada acrescenta:

**A entrada é um momento.** Depois do login, a saudação aparece sozinha antes do
acervo, com respiro generoso. O cliente não cai num grid: ele é recebido.

**Mobile em primeiro lugar de verdade.** A maioria do acesso é celular, então a
área privada é desenhada no celular e adaptada para o desktop, não o contrário.

**Discrição como estética.** Sem contador de visitas, sem selo de "novo", sem
badge. A peça nova se anuncia na saudação, em texto, não com etiqueta colorida.

**A landing pública precisa ser excelente**, porque agora ela é a única coisa
que um desconhecido vê. Ela deixa de vender peça e passa a vender **a casa** — e
o convite a solicitar acesso é o único CTA.

---

## 10. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| **Telefone como senha** | **Alto** | Registrado em D24. Tela de troca no primeiro login, aditiva, quando o dono quiser |
| Link de convite repassado | Médio | Uso único, validade de 7 dias |
| Tabela de eventos enche o free tier | Médio | Agregação diária desde o início |
| Acervo privado mata o SEO | Baixo | É o objetivo. A landing continua indexável |
| Cliente não consegue entrar e desiste | Médio | Recuperação por e-mail e o WhatsApp do Andre visível na tela de acesso |
| Andre esquece de aprovar pedidos | Médio | Aviso por e-mail a cada pedido novo |

---

## 11. Decisões desta fase

| # | Decisão | Data |
|---|---|---|
| D24 | **Auth**: e-mail e senha, senha inicial = telefone, troca não obrigatória. Risco aceito pelo dono, mitigação disponível | 2026-08-24 |
| D25 | **Entrada**: os três caminhos — cadastro direto, pedido com aprovação, convite por link de uso único | 2026-08-24 |
| D26 | **Saudação**: repositório escrito à mão com variação por contexto, sem IA em runtime | 2026-08-24 |
| D27 | **Banco**: Supabase, escolhido por resolver auth e RLS junto com Postgres | 2026-08-24 |
| D28 | **Privacidade**: todo o acervo atrás do login. A home vira landing institucional sem nenhuma peça | 2026-08-24 |
| D29 | **Funil identificado**: com acesso autenticado, o funil mostra quem viu o quê, não só quantos | 2026-08-24 |
