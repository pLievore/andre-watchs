# BALANÇO — o que foi prometido × o que existe

> Levantamento feito em 2026-08-24, comparando `PLANO-CLUBE.md` com o código e
> o banco reais. Motivo: as fases vinham sendo fechadas por item, sem olhar o
> conjunto — e o `FASE-3.md` chegou a marcar como pronto duas páginas que davam
> 404.
>
> **Método**: consulta direta ao banco para saber que tabela existe, e leitura
> do código para saber que tela existe. Não confiei em nenhum status escrito.

---

## Resumo

O **clube funciona**: cliente entra, vê o acervo, e ninguém de fora vê nada.
Isso está validado ponta a ponta, inclusive pela API.

O **painel está pela metade**. Ele gerencia acesso de pessoas, mas quase não
gerencia o negócio: não cria peça, não troca foto, e não mostra nada sobre
quem olhou o quê — que é a parte que o PLANO chamava de "a que mais vale
dinheiro".

---

## Peças

> **Atualizado em 2026-08-28**: esta seção foi resolvida. Ver `supabase/fase-4.sql`.

| Prometido (§7) | Existe? |
|---|---|
| Editar peça | ✅ formulário completo · botão "Editar" explícito na lista |
| Estado da peça | ✅ **três** estados: disponível, em negociação, vendida |
| Marcar consignada | ✅ no formulário |
| **Criar peça nova** | ✅ `/painel/pecas/nova` |
| **Upload de foto** | ✅ múltiplas, ordem, alt, exclusão — bucket privado |
| Excluir peça | ✅ com confirmação por digitação do nome |
| Arquivar | ⚠️ "vendida" cobre o caso; arquivar de fato não existe |

**O que mudou de arquitetura**: `disponivel boolean` não conseguia representar
"em negociação" — booleano tem dois estados e o negócio tem três. Virou o enum
`estado_peca`. A coluna antiga continua existindo, mantida em sincronia por
trigger, para que nenhuma consulta ainda não migrada passe a mentir.

**Fotos ficam em bucket privado.** Se fossem públicas, bastaria compartilhar o
endereço da imagem para furar o clube inteiro sem login. As URLs chegam ao
cliente como link assinado de uma hora, gerado no servidor (`src/lib/db/fotos.ts`).

---

## Clientes

> **Atualizado em 2026-08-28**: a gestão passou a ser o cadastro inteiro, e não
> só o interruptor de acesso.

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
| **Gerar convite por link** | ❌ **não existe** — sem tabela `convites` |

Dos três caminhos de entrada decididos em D25, **dois funcionam**: cadastro por
aprovação e pedido de acesso. O convite por link nunca foi construído.

---

## Funil — não existe

| Prometido (§7) | Existe? |
|---|---|
| Acessos por período | ❌ |
| Peças mais vistas | ❌ |
| Idas ao WhatsApp | ❌ |
| **Quem viu o quê** | ❌ |

Não há tabela `eventos`. O `AccessVisitRecorder` no acervo **parece** registrar
visita, mas só atualiza `clientes.ultimo_acesso` — serve à saudação, não ao
funil. A PDP não registra nada quando uma peça é aberta.

Isto é o que o PLANO-CLUBE §1 chamava de "a consequência boa e não óbvia" do
clube: com acesso identificado, o funil deixa de ser anônimo e vira lista de
prospecção. **Nada disso existe hoje.**

---

## Interesses — não existe

| Prometido (§7) | Existe? |
|---|---|
| Ida ao WhatsApp vira registro | ❌ |
| Mover entre em conversa / negociando / vendido / perdido | ❌ |
| Taxa de fechamento | ❌ |

Sem tabela `interesses`. O botão de WhatsApp na PDP abre a conversa e não deixa
rastro.

---

## Banco — o que falta

| Tabela | Prometida | Existe |
|---|---|---|
| `pecas` | ✅ | ✅ 10 linhas |
| `fotos` | ✅ | ✅ 18 linhas |
| `clientes` | ✅ | ✅ |
| `solicitacoes_acesso` | (surgiu depois, boa decisão) | ✅ |
| `convites` | ✅ | ❌ |
| `eventos` | ✅ | ❌ |
| `interesses` | ✅ | ❌ |

Os tipos enum de todas já estão no `schema.sql`.

---

## O que falta, em ordem de valor para o dono

**1. Criar peça + upload de foto** — sem isso o painel não cumpre a promessa
básica: o Andre continua dependente para cada peça nova. É o maior buraco.

**2. Eventos e funil identificado** — a informação que o clube tornou possível
e que nenhum concorrente dele tem. Precisa da tabela `eventos`, do registro na
PDP e no clique de WhatsApp, e das telas de leitura.

**3. Interesses** — transforma o funil em pipeline de venda. Depende de 2.

**4. Convites por link** — completa o terceiro caminho de entrada. Menor valor
imediato: os outros dois já resolvem o cadastro.

**5. Arquivar peça** — hoje "vendida" cobre; só vira necessário se ele quiser
tirar do registro sem apagar.
