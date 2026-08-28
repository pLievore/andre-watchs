/**
 * Proteção do acervo — por prefixo de rota, não página a página.
 *
 * Escolha deliberada: rota nova dentro de `/acervo` ou `/painel` **nasce
 * protegida**. Se a regra vivesse em cada página, esquecer de aplicá-la numa
 * página nova seria fácil e silencioso — e o custo do esquecimento é acervo
 * exposto.
 *
 * O middleware não é a única defesa. O RLS no banco nega de novo, mesmo que
 * alguém encontre um caminho que passe por aqui. Ver docs/BANCO.md.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_OPTIONS } from "@/lib/db/auth-cookies";

/** Prefixos que exigem sessão e status `ativo`. */
const PROTEGIDAS = ["/acervo", "/painel"];

export async function middleware(request: NextRequest) {
  const cookiesSessao: {
    name: string;
    value: string;
    options: CookieOptions;
  }[] = [];
  const headersSessao = new Map<string, string>();

  const aplicarSessao = (response: NextResponse) => {
    cookiesSessao.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, options),
    );
    headersSessao.forEach((value, key) => response.headers.set(key, value));
    return response;
  };

  const redirecionar = (url: URL) =>
    aplicarSessao(NextResponse.redirect(url));

  // Esta resposta é a que sai daqui: o cliente do Supabase escreve nela os
  // cookies de sessão renovada.
  let resposta = NextResponse.next({ request });

  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(novos, headers) {
          cookiesSessao.push(...novos);
          Object.entries(headers).forEach(([key, value]) =>
            headersSessao.set(key, value),
          );
          novos.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          aplicarSessao(resposta);
        },
      },
    },
  );

  // `getUser` valida o token no servidor. `getSession` só lê o cookie e
  // acreditaria num cookie forjado — por isso não serve para autorizar.
  const {
    data: { user },
  } = await db.auth.getUser();

  const caminho = request.nextUrl.pathname;
  const protegida = PROTEGIDAS.some(
    (p) => caminho === p || caminho.startsWith(`${p}/`),
  );

  // O status é necessário tanto para autorizar rota privada quanto para saber
  // se `/acesso` deve redirecionar. Consultar uma vez evita o loop de sessão
  // pendente: autenticado não significa autorizado.
  let status: string | null = null;
  if (user && (protegida || caminho === "/acesso")) {
    const { data: cliente } = await db
      .from("clientes")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    status = cliente?.status ?? null;
  }

  if (protegida) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso";
      // Para devolver a pessoa ao lugar certo depois de entrar.
      url.searchParams.set("destino", `${caminho}${request.nextUrl.search}`);
      return redirecionar(url);
    }

    // Autenticado não basta: recusado e desativado continuam com login válido.
    if (status !== "ativo") {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso";
      url.searchParams.set("estado", status ?? "pendente");
      return redirecionar(url);
    }
  }

  // Já entrou e vai para a tela de acesso — manda direto ao acervo.
  if (caminho === "/acesso" && user && status === "ativo") {
    const url = request.nextUrl.clone();
    url.pathname = "/acervo";
    url.search = "";
    return redirecionar(url);
  }

  return aplicarSessao(resposta);
}

export const config = {
  /**
   * Roda em tudo, menos estático. O negativo é mais seguro que uma lista de
   * rotas protegidas: rota nova entra coberta por padrão.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:webp|jpg|jpeg|png|svg|mp4|ico)$).*)",
  ],
};
