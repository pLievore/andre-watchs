import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { usuarioAdmin } from "@/lib/db/admin-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel · ANDRE WATCHES" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/painel", label: "Pedidos de acesso" },
  { href: "/painel/clientes", label: "Clientes" },
  { href: "/painel/pecas", label: "Peças" },
] as const;

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // O middleware é a primeira barreira; esta checagem mantém a área segura
  // mesmo se uma rota nova aqui dentro for chamada por outro caminho.
  const admin = await usuarioAdmin();
  if (!admin) redirect("/acesso");

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-40">
      <p className="eyebrow">Painel</p>
      <nav
        aria-label="Painel"
        className="mt-6 flex gap-8 border-b"
        style={{ borderColor: "var(--color-border)" }}
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="label link-quiet pb-4"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-12">{children}</div>
    </section>
  );
}
