/**
 * SPEC §7 — ponto ÚNICO de verdade da conversão.
 *
 * Nesta fase não existe carrinho: toda intenção de compra, troca, venda ou
 * consignação vira uma conversa no WhatsApp com mensagem pré-preenchida.
 * Trocar o número da casa = mexer só em `WHATSAPP_NUMBER` aqui.
 *
 * ⚠️ D7 pendente (SPEC §14): o número abaixo é placeholder. Enquanto
 * `WHATSAPP_NUMBER` não for confirmado, o componente cai para o Instagram,
 * que é canal real e público da casa — nunca para um número inventado.
 */

import Link from "next/link";

export const STORE_WHATSAPP_NUMBER = "5542988706221";
export const STORE_WHATSAPP_DISPLAY = "+55 42 98870-6221";

/** Formato E.164 sem "+", como a wa.me exige. */
const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || STORE_WHATSAPP_NUMBER;

const SIGNATURE = "— enviado pelo site da Andre Watches";

export type WhatsappCtaVariant = "primary" | "secondary" | "link";

interface WhatsappCtaProps {
  label: string;
  /** Linha de contexto que abre a conversa. Sem isso, a mensagem é genérica. */
  context?: string;
  variant?: WhatsappCtaVariant;
  className?: string;
  onClick?: () => void;
}

/** Monta a URL de destino direta para o WhatsApp oficial da loja. */
export function contactHref(context?: string): string {
  const message = [context, SIGNATURE].filter(Boolean).join("\n\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Rótulo do canal ativo oficial */
export const CONTACT_CHANNEL = "WhatsApp";

const VARIANT_CLASS: Record<WhatsappCtaVariant, string> = {
  primary: "btn btn-primary",
  secondary: "btn btn-ghost",
  link: "label link-quiet inline-flex items-center gap-2",
};

export function WhatsappCta({
  label,
  context,
  variant = "primary",
  className = "",
  onClick,
}: WhatsappCtaProps) {
  const href = contactHref(context);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`${VARIANT_CLASS[variant]} ${className}`}
    >
      {label}
      <span aria-hidden>→</span>
      <span className="sr-only">(abre o {CONTACT_CHANNEL} em nova aba)</span>
    </Link>
  );
}
