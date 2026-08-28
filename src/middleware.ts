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

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Prefixos que exigem sessão e status `ativo`. */
const PROTEGIDAS = ["/acervo", "/painel"];

export async function middleware(request: NextRequest) {
  // Esta resposta é a que sai daqui: o cliente do Supabase escreve nela os
  // cookies de sessão renovada.
  let resposta = NextResponse.next({ request });

  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(novos) {
          novos.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          novos.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
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

  if (protegida) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso";
      // Para devolver a pessoa ao lugar certo depois de entrar.
      url.searchParams.set("destino", caminho);
      return NextResponse.redirect(url);
    }

    // Autenticado não basta: recusado e desativado continuam com login válido.
    const { data: cliente } = await db
      .from("clientes")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (cliente?.status !== "ativo") {
      const url = request.nextUrl.clone();
      url.pathname = "/acesso";
      url.searchParams.set("estado", cliente?.status ?? "pendente");
      return NextResponse.redirect(url);
    }
  }

  // Já entrou e vai para a tela de acesso — manda direto ao acervo.
  if (caminho === "/acesso" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/acervo";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return resposta;
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
