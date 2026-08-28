import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * A autenticação deste projeto é exclusivamente server-side. Os tokens não
 * precisam — e não devem — ficar legíveis para JavaScript do navegador.
 *
 * O `@supabase/ssr` usa `httpOnly: false` por padrão porque também atende apps
 * com cliente Supabase no browser. Aqui a escolha é deliberadamente mais
 * restrita e precisa ser idêntica no middleware e nas Server Actions.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} satisfies CookieOptionsWithName;
