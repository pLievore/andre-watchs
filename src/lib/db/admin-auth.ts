import "server-only";

/**
 * O admin autenticado, ou `null`. Toda Server Action de `/painel` começa
 * chamando isto — o middleware é a primeira barreira, esta é a segunda,
 * igual ao padrão já usado para cliente ativo em `acervo/actions.ts`.
 */

import { isAdminEmail } from "@/lib/admin";
import { dbServidor } from "@/lib/db/server";

export async function usuarioAdmin() {
  const db = await dbServidor();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}
