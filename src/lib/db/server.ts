import "server-only";

/**
 * Cliente de banco **com a sessão do usuário** — para Server Components.
 *
 * Diferença para o `db` de `client.ts`: aquele é anônimo e só enxerga o que é
 * público. Este carrega o cookie de sessão, então o RLS sabe quem está pedindo
 * e libera o acervo se a pessoa for cliente ativo.
 *
 * Regra prática: página dentro de `/acervo` usa este. Página pública usa o
 * outro. Escrita usa o `admin.ts`.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function dbServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(novos) {
          try {
            novos.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            // Server Component não pode escrever cookie. Tudo bem: quem renova
            // a sessão é o middleware, que roda antes e tem permissão.
          }
        },
      },
    },
  );
}

/**
 * O cliente logado, ou `null`.
 *
 * Devolve o registro da tabela `clientes` — nome, status — e não só o usuário
 * do Auth, porque é disso que a saudação e a verificação de acesso precisam.
 */
export async function clienteAtual() {
  const db = await dbServidor();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from("clientes")
    .select("id, nome, email, status, ultimo_acesso")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}
