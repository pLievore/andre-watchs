# FASE 2 — Porta

> **Objetivo**: o acervo passa a exigir login. A home vira landing
> institucional. **É aqui que o produto vira clube.**
>
> Fase 1 trocou a fonte de dados com a tela parada. Agora a tela muda, com a
> fonte já estável.

---

## Estado

| # | Passo | Status |
|---|---|---|
| 2.1 | Tabela `clientes` + `solicitacoes_acesso`, RLS apertado | ✅ aplicado em produção, confirmado por consulta |
| 2.2 | Auth do Supabase no servidor (sessão em cookie) | ✅ |
| 2.3 | Middleware de proteção | ✅ |
| 2.4 | `/acesso` — entrar e pedir acesso | ✅ |
| 2.5 | `/acervo` e `/acervo/[slug]` | ✅ |
| 2.6 | Home vira institucional | ✅ |
| 2.7 | Saudação de boas-vindas | ✅ ligada em `/acervo` |
| 2.8 | Verificação | ✅ ver checklist — falta só o deploy |

Legenda: ⬜ pendente · 🟡 em andamento · ✅ concluído

⚠️ **A migração já está em produção; o deploy do código, não.** Ver
[ESTADO.md](ESTADO.md) — o Supabase é compartilhado entre local e produção, e
isso deixou o `/colecao` público de pé só por cache estático.

---

## Decisões desta fase

Tomadas em 2026-08-24, antes de escrever código:

**Home** — mantém o hero (é macro de relógio, não expõe acervo, e é o melhor
ativo visual do projeto). Abaixo dele ficam os pilares que já existem, um trecho
sobre a casa e o convite a solicitar acesso. **Saem** a vitrine e o CTA com
peças.

**`/vender` continua pública.** Quem quer vender um relógio para a casa não
precisa ver o acervo, e essa página é porta de entrada de negócio — metade da
operação. Fechá-la seria perder contato à toa.

**Após o login, vai direto para `/acervo`**, que abre com a saudação no topo e o
grid abaixo. Sem tela intermediária: no celular cada toque a mais pesa, e a
partir da terceira visita cerimônia vira atrito.

---

## 2.1 — `clientes` e o RLS apertado

Duas coisas acontecem aqui, e a ordem importa.

**A tabela `clientes`** guarda quem pode entrar. O `id` referencia
`auth.users(id)` — a identidade fica no Supabase Auth, os dados de negócio
(telefone, status, último acesso) ficam na nossa tabela.

**As políticas de `pecas` e `fotos` mudam**: de leitura pública para leitura só
de cliente **ativo**. Não basta estar autenticado — um cliente recusado ou
desativado continua com login válido e não pode ver nada.

```sql
create policy pecas_leitura_cliente_ativo
  on pecas for select
  using (exists (
    select 1 from clientes
    where clientes.id = auth.uid() and clientes.status = 'ativo'
  ));
```

⚠️ **Depois disso, o site público quebra até o passo 2.5 existir.** É esperado:
a proteção entra antes das telas, nunca depois. O contrário deixaria uma janela
com acervo exposto.

**Isso já aconteceu.** A migração foi aplicada no Supabase de produção em
2026-08-28 (confirmado por consulta: a chave publishable, sem sessão, não
devolve mais nenhuma peça). O passo 2.5 já existe neste commit — falta publicar
para o público parar de ver `/colecao` vazio e passar a ver `/acesso`.

O SQL vive em [`supabase/fase-2.sql`](../supabase/fase-2.sql).

---

## 2.2 — Auth no servidor

O `@supabase/ssr` cuida da sessão em cookie `httpOnly`, que Server Component e
middleware conseguem ler.

Três clientes, cada um com seu lugar:

| Arquivo | Onde roda | Para quê |
|---|---|---|
| `db/server.ts` | Server Component | leitura com a sessão do usuário |
| `db/middleware.ts` | middleware | renovar sessão e checar acesso |
| `db/admin.ts` | servidor, já existe | escrita que ignora RLS |

O `db/client.ts` da Fase 1 continua para o que é público (a home).

---

## 2.3 — Middleware

Protege por prefixo, não página a página:

- `/acervo/*` e `/painel/*` exigem sessão **e** status `ativo`
- Sem sessão → `/acesso`
- Sessão mas status não-ativo → `/acesso?estado=pendente`

**Rota nova nasce protegida.** Esquecer de proteger deixa de ser possível — é
por isso que a regra vive no middleware e não em cada arquivo.

---

## 2.4 — `/acesso`

Uma página, duas funções:

**Entrar** — e-mail e senha. A senha inicial é o telefone (D24). A mensagem de
erro nunca diz se o e-mail existe: *"e-mail ou senha incorretos"* e ponto —
senão vira ferramenta de descobrir quem é cliente da casa.

**Pedir acesso** — nome, e-mail, telefone e uma linha de contexto. **Não cria
`clientes` nem conta no Auth**: entra em `solicitacoes_acesso`, uma fila
simples (docs/BANCO.md). Criar identidade antes da aprovação permitiria que
qualquer um ocupasse o e-mail de um futuro cliente; o painel da Fase 3 é quem
promove um pedido a cliente de verdade. O texto de retorno é claro sobre o que
acontece: *"pedido registrado. A casa avalia e entra em contato pelo
WhatsApp."*

Também nesta tela: o WhatsApp da casa visível, para quem não conseguir entrar
ter uma saída que não seja desistir.

---

## 2.5 — `/acervo`

`/colecao` → `/acervo` e `/relogios/[slug]` → `/acervo/[slug]`.

Os componentes não mudam: `CollectionGrid`, `WatchCard` e `WatchGallery` já
recebem os dados por prop. Muda **onde** os dados são buscados (agora com a
sessão) e **quem** pode chegar.

Redirecionamento permanente das rotas antigas — link já compartilhado não pode
virar 404, mesmo que agora leve ao login.

---

## 2.6 — Home institucional

Sai `WatchShowcase`, sai `ClosingCta` com peças. Entra uma seção sobre a casa e
o convite a solicitar acesso.

O header muda conforme o estado: visitante vê **Entrar**; cliente vê **Acervo**
e **Sair**.

---

## 2.7 — Saudação

Repositório escrito à mão (D26), com variação por contexto: primeira visita,
peça nova desde o último acesso, cliente que sumiu, hora do dia.

**Tom: discreto, nunca efusivo.** Sem exclamação, sem emoji. Deve soar como um
vendedor experiente recebendo alguém que conhece — não como notificação de
aplicativo. Num site de peça de R$ 200 mil, entusiasmo barateia.

Implementação em `src/lib/saudacao.ts` — o cabeçalho do arquivo traz as
regras de tom, com exemplo de frase ruim e frase boa. Leia antes de acrescentar.

---

## 2.8 — Verificação

- [x] `npx tsc --noEmit` limpo
- [x] Deslogado: `/acervo` redireciona para `/acesso`
- [x] Deslogado: `/acervo/[slug]` redireciona, mesmo com link direto
- [x] Cliente `pendente` loga mas não vê acervo
- [x] Cliente `ativo` vê o acervo e a saudação com o nome
- [x] Home, `/sobre` e `/vender` seguem públicas
- [x] `/colecao` redireciona para `/acervo`
- [x] Erro de login não revela se o e-mail existe
- [x] **Consulta direta à API com a chave publishable, sem sessão, não devolve peça**
- [ ] Testado em celular físico (só verificado por breakpoint responsivo)

O penúltimo item é o que prova que a proteção é do banco e não só da aplicação.

Verificado em local em 2026-08-28 com dois clientes descartáveis
(`scripts/criar-cliente.mjs` + um segundo com status `pendente`), removidos
depois pelo Auth admin. Falta só o deploy.

---

## Feito é quando

Um desconhecido não consegue ver nenhuma peça por nenhum caminho — nem por
link direto, nem pela API. E um cliente entra, é recebido pelo nome e vê o
acervo.
