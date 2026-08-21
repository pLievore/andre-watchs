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

/** Formato E.164 sem "+", como a wa.me exige. Ex.: "5511999999999". */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

const INSTAGRAM_URL = "https://instagram.com/andrewatchesbr";

const SIGNATURE = "— enviado pelo site da Andre Watches";

export type WhatsappCtaVariant = "primary" | "secondary" | "link";

interface WhatsappCtaProps {
  label: string;
  /** Linha de contexto que abre a conversa. Sem isso, a mensagem é genérica. */
  context?: string;
  variant?: WhatsappCtaVariant;
  className?: string;
}

/** Monta a URL de destino: WhatsApp quando há número, Instagram como fallback. */
export function contactHref(context?: string): string {
  const message = [context, SIGNATURE].filter(Boolean).join("\n\n");
  if (!WHATSAPP_NUMBER) return INSTAGRAM_URL;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/** Rótulo do canal ativo — usado onde o texto precisa nomear o canal. */
export const CONTACT_CHANNEL = WHATSAPP_NUMBER ? "WhatsApp" : "Instagram";

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
}: WhatsappCtaProps) {
  const href = contactHref(context);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${VARIANT_CLASS[variant]} ${className}`}
    >
      {label}
      <span aria-hidden>→</span>
      <span className="sr-only">(abre o {CONTACT_CHANNEL} em nova aba)</span>
    </Link>
  );
}
