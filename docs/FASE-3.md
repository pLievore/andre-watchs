# FASE 3 — Painel

> **Objetivo**: o Andre deixa de depender de scripts de linha de comando pra
> operar a casa. Ele aprova ou recusa quem pediu acesso, ativa ou desativa
> cliente, e edita as peças do acervo — tudo pelo navegador.
>
> Fase 2 abriu a porta. Esta fase dá a chave pra quem fica do lado de dentro
> dela como dono, não como cliente.

---

## Estado

| # | Passo | Status |
|---|---|---|
| 3.1 | Quem é admin (`ADMIN_EMAILS`, sem tabela nova) | ✅ |
| 3.2 | Login e middleware reconhecem admin | ✅ |
| 3.3 | `/painel` — aprovar/recusar pedidos de acesso | ✅ |
| 3.4 | `/painel/clientes` — listar e mudar status | ✅ |
| 3.5 | `/painel/pecas` — listar e editar (sem foto ainda) | ✅ validado com sessão de admin |
| 3.6 | Upload de foto (recorte, WebP, tamanhos) | ⬜ |
| 3.7 | Criar peça nova pelo painel | ⬜ |
| 3.8 | Convites por link (uso único, 7 dias) | ⬜ |
| 3.10 | Casca própria do painel (route groups) | ✅ |
| 3.9 | Verificação | 🟡 porta, peças e clientes validados; falta fotos e convites |

Legenda: ⬜ pendente · 🟡 em andamento · ✅ concluído

3.6 a 3.8 ficam para uma próxima entrega: cada um é um projeto à parte (upload
pede bucket de Storage e pipeline de imagem; convite pede token com validade).
Registrado aqui para não virar surpresa depois.

---

## 3.1 — Quem é admin

**Decisão**: e-mail em variável de ambiente (`ADMIN_EMAILS`, separado por
vírgula), não uma tabela ou coluna de role.

Por quê: existe um dono só. Uma tabela `admins` — ou uma coluna `role` em
`clientes` — seria esquema pra zero ganho (docs/BANCO.md: "criar tabela antes
da fase que a usa gera esquema morto que ninguém valida"). E o admin **não é
um cliente**: ele não precisa de linha em `clientes` pra ter acesso ao painel,
porque `/painel` não olha pra `clientes.status` — olha pro e-mail de quem
logou. Se um dia o Andre quiser navegar o acervo como cliente também, aí sim
cria-se uma linha pra ele com `scripts/criar-cliente.mjs`, sem relação com o
painel.

`src/lib/admin.ts` — só a função `isAdminEmail()`, sem import de banco. É
usada tanto no middleware (Edge) quanto nas Server Actions.

---

## 3.2 — Login e middleware

**O problema que isso resolve**: o `entrar()` da Fase 2 rejeitava qualquer
login sem linha `ativa` em `clientes` — o que bloquearia o próprio Andre, que
não é cliente. Agora `entrar()` verifica `isAdminEmail()` primeiro; se for
admin, pula a checagem de `clientes` e manda pra `/painel`. Se não for, o
fluxo é exatamente o de antes.

**Middleware**: `/acervo` e `/painel` viraram checagens independentes.
`/acervo` continua exatamente como na Fase 2 (cliente com status `ativo`,
sem exceção nem para o admin — se ele quiser ver o acervo como cliente,
precisa de cadastro como qualquer um). `/painel` exige sessão **e**
`isAdminEmail()`, e não olha `clientes` nenhuma vez.

`destinoSeguroAposLogin` (em `src/lib/rotas.ts`) ganhou um segundo parâmetro
(destino padrão) e passou a aceitar `/painel` como área interna válida, além
de `/acervo`.

---

## 3.3 — `/painel` — pedidos de acesso

Lê `solicitacoes_acesso` direto com a chave `secret` (`dbAdmin`) — o painel
não passa por RLS, é a própria definição de "só o dono entra aqui".

**Aprovar**: cria a identidade no Auth só agora (senha = telefone, como
`scripts/criar-cliente.mjs`), grava `clientes` com status `ativo`, e apaga a
linha da fila — o pedido virou cliente, não precisa mais existir como pedido.

**Recusar**: marca `resolvido_em` e mantém a linha. "A lista de recusados
também é informação" (PLANO-CLUBE §7) — por isso ela não é apagada, só some da
lista de pendentes e aparece numa lista curta de recusados recentes.

Sem e-mail de aviso a cada pedido novo (D-registro do PLANO-CLUBE §10 fala
nisso como mitigação de "Andre esquece de aprovar") — fica para quando
existir algum serviço de e-mail no projeto. Por ora, o Andre precisa abrir o
painel pra ver a fila.

---

## 3.4 — `/painel/clientes`

Lista nome, e-mail, telefone e último acesso. Cada linha tem um `<select>`
com os quatro status e um botão de salvar — sem JavaScript de mais, é
`<form>` com Server Action, igual ao resto do site.

Não tem geração de convite nem cadastro direto por aqui ainda — cadastro
direto continua sendo `scripts/criar-cliente.mjs` até o 3.8 decidir se convite
substitui o script ou convive com ele.

---

## 3.5 — `/painel/pecas`

Lista todas as peças (`dbAdmin`, reaproveitando `CAMPOS`/`paraWatch` de
`src/lib/db/pecas.ts` — a tradução banco↔`Watch` continua sendo só ali, o
painel não reinventa). Cada peça abre em `/painel/pecas/[slug]` com um
formulário para todos os campos de `pecas` (marca, modelo, condição,
integralidade, specs, preço, disponível, consignada, história, notas).

**Sem criar peça nova e sem upload de foto nesta entrega** (3.6/3.7). Editar
o que já existe já tira o Andre de precisar pedir pra alguém rodar SQL a cada
peça vendida ou reprecificada — que é o efeito mais imediato. Criar peça do
zero sem conseguir subir foto seria uma tela pela metade.

---

## 3.9 — Verificação

- [x] `npx tsc --noEmit` limpo
- [x] Sem sessão: `/painel` redireciona para `/acesso`
- [x] Cliente ativo (não-admin) tentando `/painel`: redireciona para `/acesso`, não vê nada
- [x] Admin loga e cai em `/painel`, não em `/acervo`
- [x] Aprovar pedido: cria login novo, some da fila, aparece em `/painel/clientes` como ativo
- [x] Recusar pedido: some da fila de pendentes, some para a lista de recusados
- [x] Mudar status de cliente em `/painel/clientes` reflete no acesso dele a `/acervo` (desativar tira o acesso)
- [x] Editar peça em `/painel/pecas/[slug]` reflete no `/acervo` e na PDP
- [x] `/acervo` continua exigindo `clientes.status = 'ativo'` mesmo para o e-mail do admin, sem exceção

Verificado em local em 2026-08-28 com o e-mail de teste já cadastrado
(`ADMIN_EMAILS`) e um pedido/cliente descartáveis, removidos depois.

---

## Feito é quando

O Andre aprova um pedido, muda o preço de uma peça e desativa um cliente sem
precisar de mim, de um script ou de abrir o Supabase.
