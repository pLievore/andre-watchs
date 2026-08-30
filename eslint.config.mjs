/**
 * Lint — o segundo portão, ao lado de `npx tsc --noEmit`.
 *
 * Antes disto o `package.json` chamava `next lint` sem que existisse eslint
 * instalado: o script quebrava para quem o rodasse. Agora ele roda de verdade.
 *
 * `next/core-web-vitals` traz as regras de React, hooks e imagem do próprio
 * Next; `next/typescript` acrescenta as de TypeScript. Config plana (ESLint 9),
 * montada pelo FlatCompat porque o preset do Next ainda vem no formato antigo.
 */

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      // Scripts do pipeline de mídia: Node solto, fora do app.
      "scripts/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      /*
       * `any` é erro, e o projeto está sem nenhum.
       *
       * Foi aviso enquanto as telas do painel recebiam linha crua do Supabase:
       * o cliente era criado sem tipos, então a consulta já devolvia `any` e
       * anotar diferente só esconderia isso. Desde a fase 15 os três clientes
       * carregam o `Database` gerado por `scripts/gerar-tipos-banco.mjs`, as
       * consultas voltam tipadas e o `any` deixou de ter desculpa — foi ele
       * que escondeu, por meses, um filtro por uma coluna inexistente.
       */
      "@typescript-eslint/no-explicit-any": "error",
      // Parâmetro que existe só para ocupar posição na assinatura (o `_headers`
      // do callback de cookies do Supabase, por exemplo) não é sujeira.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
