# BALANÇO — o que foi prometido × o que existe

> Levantamento comparando `PLANO-CLUBE.md` com o código e o banco reais.
>
> **Método**: consulta direta ao banco para saber que tabela existe, e leitura
> do código para saber que tela existe.

---

## Resumo

O **clube funciona**: cliente entra, vê o acervo, e ninguém de fora vê nada.
Isso está validado ponta a ponta, inclusive pela API.

O **núcleo operacional do painel funciona**: cria e edita peças, gerencia suas
fotos, mantém o cadastro completo de clientes e gera convites de uso único.

A **camada de inteligência funciona**: o funil registra acessos, visualizações
na PDP e cliques no WhatsApp, monta ranking das peças mais procuradas e
transforma o interesse em pipeline comercial de negociação com status atualizável.

---

## Peças

| Prometido (§7) | Existe? |
|---|---|
| Editar peça | ✅ formulário completo · botão "Editar" explícito na lista |
| Estado da peça | ✅ **três** estados: disponível, em negociação, vendida |
| Marcar consignada | ✅ no formulário |
| **Criar peça nova** | ✅ `/painel/pecas/nova`, já com seleção de fotos |
| **Upload de foto** | ✅ múltiplas, até 10 MB cada, ordem, alt automático e exclusão — bucket privado |
| Excluir peça | ✅ com confirmação por digitação do nome |
| Arquivar | ⚠️ "vendida" cobre o caso |

---

## Clientes

| Prometido (§7) | Existe? |
|---|---|
| Lista com nome, e-mail, telefone | ✅ com busca por nome/e-mail/telefone |
| Último acesso | ✅ em linguagem relativa |
| Fila de pendentes, aprovar/recusar | ✅ |
| Status | ✅ os **quatro**, não só ativo/inativo |
| **Ficha do cliente** | ✅ `/painel/clientes/[id]` |
| **Editar cadastro** | ✅ nome, telefone, observação privada |
| **Trocar e-mail de acesso** | ✅ grava no Auth e na tabela juntos |
| **Redefinir senha** | ✅ volta ao telefone ou define uma específica |
| **Cadastrar cliente direto** | ✅ sem passar pela fila de pedidos |
| **Excluir cliente** | ✅ com confirmação por digitação |
| **Gerar convite por link** | ✅ `convites`, uso único, 7 dias, texto WhatsApp |

Os três caminhos de entrada decididos em D25 funcionam: cadastro direto,
pedido com aprovação e convite por link.

---

## Funil

| Prometido (§7) | Existe? |
|---|---|
| Acessos por período | ✅ últimos 30 dias nos cards do painel |
| Peças mais vistas | ✅ ranking das mais procuradas |
| Idas ao WhatsApp | ✅ conversões diretas contabilizadas |
| **Quem viu o quê** | ✅ na ficha do cliente e na ficha da peça |

Tabela `eventos` criada e alimentada na visita ao acervo, na PDP e no clique de WhatsApp.

---

## Interesses

| Prometido (§7) | Existe? |
|---|---|
| Ida ao WhatsApp vira registro | ✅ upsert automático em `interesses` |
| Mover entre em conversa / negociando / vendido / perdido | ✅ `SeletorStatusInteresse` com 1 clique |
| Taxa de fechamento | ✅ calculada e exibida no funil |

Tabela `interesses` conectada ao pipeline em `/painel/negociacoes`, além de constar no histórico da ficha do cliente e da peça.

---

## Banco de dados

| Tabela | Prometida | Existe |
|---|---|---|
| `pecas` | ✅ | ✅ |
| `fotos` | ✅ | ✅ |
| `clientes` | ✅ | ✅ |
| `solicitacoes_acesso` | ✅ | ✅ |
| `convites` | ✅ | ✅ |
| `eventos` | ✅ | ✅ |
| `interesses` | ✅ | ✅ |

Todas as tabelas do plano estão criadas no Supabase com RLS estrito.