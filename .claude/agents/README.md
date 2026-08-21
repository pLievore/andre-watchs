# Agentes — ANDRE WATCHES

Especialistas invocáveis pelo Claude Code (`Agent` tool ou pelo nome no FleetView).
Cada arquivo `.md` é uma definição: frontmatter (`name`, `description`, `model`,
`tools`) + as instruções que o agente carrega ao ser lançado.

| Agente | Use quando |
|---|---|
| `motion-choreographer` | Qualquer animação: scroll-driven, reveal, scrubbing de canvas, hover, jank |
| `design-system` | Tokens, paleta, tipografia, espaçamento, componentes primitivos |
| `horology-copy` | Nome/descrição de peça, headline, microcopy, terminologia horológica |
| `nextjs-architect` | Estrutura de rota, fronteira RSC/client, metadata, tipos de domínio |
| `a11y-perf` | Auditoria antes de fechar uma seção; mídia pesada; review de qualidade |
| `asset-pipeline` | Frames do hero, ffmpeg/sharp, drift de sequência, fotos de produto |

## Fonte da verdade
`SPEC.md` na raiz manda em produto e escopo. `CLAUDE.md` manda em regras de
execução. Todo agente deve deferir a esses dois — se um agente contradiz o SPEC,
o SPEC ganha e o agente é que precisa ser corrigido.
