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
import { cache } from "react";

import { AUTH_COOKIE_OPTIONS } from "@/lib/db/auth-cookies";

export type StatusCliente = "ativo" | "pendente" | "recusado" | "inativo";

export type ClienteAtual = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: StatusCliente;
  ultimo_acesso: string | null;
};

export async function dbServidor() {
  const jar = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll: () => jar.getAll(),
        setAll(novos, _headers) {
          try {
            novos.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            // Server Component não pode escrever cookie. Tudo bem: quem renova
            // a sessão é o middleware, que roda antes e tem permissão.
            // Em Server Actions, o próprio Next já marca a resposta POST como
            // não armazenável; os headers anti-cache são aplicados no middleware.
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
export const clienteAtual = cache(async (): Promise<ClienteAtual | null> => {
  const db = await dbServidor();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data, error } = await db
    .from("clientes")
    .select("id, nome, email, telefone, status, ultimo_acesso")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar cliente atual: ${error.message}`);
  return data as ClienteAtual | null;
});
