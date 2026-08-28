/**
 * Quem é admin — a casa, não um cliente.
 *
 * Lista de e-mails em variável de ambiente, não tabela nem coluna de role:
 * existe um dono só, e criar esquema pra isso seria esquema morto (docs/
 * BANCO.md). Sem import de banco de propósito — o middleware roda no Edge e
 * precisa desta função tanto quanto as Server Actions.
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
