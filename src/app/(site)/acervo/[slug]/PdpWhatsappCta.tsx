"use client";

import { WhatsappCta, type WhatsappCtaVariant } from "@/components/contact/WhatsappCta";
import { registrarCliqueWhatsapp } from "./actions";

export function PdpWhatsappCta({
  label,
  context,
  pecaId,
  variant = "primary",
  className = "",
}: {
  label: string;
  context?: string;
  pecaId?: string;
  variant?: WhatsappCtaVariant;
  className?: string;
}) {
  return (
    <WhatsappCta
      label={label}
      context={context}
      variant={variant}
      className={className}
      onClick={() => {
        if (pecaId) {
          void registrarCliqueWhatsapp(pecaId);
        }
      }}
    />
  );
}