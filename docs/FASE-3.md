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
| 3.5 | `/painel/pecas` — listar e editar | ✅ validado com sessão de admin |
| 3.6 | Upload de foto (bucket privado, até 10 MB) | ✅ validado com JPEG de 4,34 MB |
| 3.7 | Criar peça nova pelo painel | ✅ já aceita fotos no cadastro |
| 3.8 | Convites por link (uso único, 7 dias) | ⬜ |
| 3.10 | Casca própria do painel (route groups) | ✅ |
| 3.9 | Verificação | 🟡 porta, peças, clientes e fotos validados; falta convite |

Legenda: ⬜ pendente · 🟡 em andamento · ✅ concluído

O 3.8 fica para uma próxima entrega: convite pede token de uso único com
validade e uma tabela própria. Registrado aqui para não virar surpresa depois.

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
`/acervo` continua exatamente como na Fase 2 para clientes, mas o admin também
pode abrir o acervo a partir do painel sem ganhar uma linha falsa em
`clientes`. `/painel` exige sessão **e** `isAdminEmail()`, e não olha
`clientes` nenhuma vez. As portas são separadas: `/acesso` para cliente e
`/painel/entrar` para o dono.

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

Lista nome, e-mail, telefone e último acesso, com busca e os quatro status. A
ficha permite editar cadastro, trocar o e-mail de login nos dois lugares em que
ele vive, redefinir senha e excluir cadastro errado. Também existe cadastro
direto pelo painel. Só a geração de convite ainda não foi construída.

---

## 3.5 — `/painel/pecas`

Lista todas as peças e deixa claro o estado comercial: disponível, em
negociação ou vendida. Cada peça abre em `/painel/pecas/[slug]` com formulário
completo, gerenciamento de fotos e exclusão coordenada entre banco e Storage.

## 3.6 — Fotos

O bucket `pecas` é privado, limitado a oito imagens por peça e 10 MB por
arquivo. Cadastro e edição compartilham o mesmo fluxo de upload: uma Server
Action autenticada cria os caminhos assinados, o navegador envia os bytes
direto ao Storage e outra ação confirma os objetos antes de inserir as linhas.
Isso evita o limite de 1 MB das Server Actions sem aumentar o limite global.

A primeira foto é capa, a segunda é o hover e as demais são galeria. A tela
troca a ordem imediatamente com `useOptimistic` e anima `layout`; a função SQL
`mover_foto` consolida a troca em transação e serializa concorrência por peça.

## 3.7 — Criar peça

`/painel/pecas/nova` pede apenas o que está confirmado quando a peça chega e já
aceita até oito fotos. A peça é criada primeiro; se a rede falhar durante as
imagens, ela permanece cadastrada sem foto e a interface leva à tentativa de
upload, sem duplicar o registro.

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
- [x] Cliente não ativo continua barrado; admin abre o acervo pelo caminho de leitura `secret`
- [x] Criar peça com três JPEGs de 4,34 MB registra arquivos e ordens 0, 1, 2
- [x] Oito toques no mesmo frame disparam só uma troca otimista
- [x] 30 movimentos concorrentes mantêm ordens únicas e contínuas
- [x] Excluir a peça de teste remove as linhas e os objetos do Storage

Verificado em local em 2026-08-28 com o e-mail de teste já cadastrado
(`ADMIN_EMAILS`), um pedido/cliente e uma peça descartáveis, removidos depois.

---

## Feito é quando

O Andre aprova um pedido, muda o preço de uma peça e desativa um cliente sem
precisar de mim, de um script ou de abrir o Supabase.
