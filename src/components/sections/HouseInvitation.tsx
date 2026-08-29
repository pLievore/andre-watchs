import Link from "next/link";

/**
 * Fechamento institucional da home.
 *
 * A landing pública apresenta a casa e a porta do clube, nunca o estoque. Por
 * isso esta seção é deliberadamente tipográfica: nenhuma foto pode sugerir que
 * uma peça específica está anunciada fora do acervo reservado.
 */
export function HouseInvitation({
  podeAbrirAcervo,
}: {
  podeAbrirAcervo: boolean;
}) {
  return (
    <section
      className="border-t"
      style={{ borderColor: "var(--color-border)" }}
      aria-labelledby="house-title"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 sm:py-16 md:gap-24 md:px-16 md:py-36 md:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <p className="eyebrow">A casa</p>
          <h2
            id="house-title"
            className="mt-6 max-w-3xl text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
              lineHeight: 0.96,
              letterSpacing: "-0.03em",
            }}
          >
            Uma casa construída peça por peça.
          </h2>
          <p
            className="mt-8 max-w-2xl text-base leading-relaxed md:text-lg"
            style={{ color: "var(--color-muted)" }}
          >
            Desde 2012, a Andre Watches compra, vende, troca e recebe em
            consignação relógios de luxo. Cada negociação começa pela mesma
            pergunta: o que se sabe, de fato, sobre este relógio.
          </p>
          <Link href="/sobre" className="link-quiet mt-8 inline-block text-sm">
            Conhecer a casa <span aria-hidden>→</span>
          </Link>
        </div>

        <aside
          className="self-end border-l pl-6 md:pl-10"
          style={{ borderColor: "var(--color-border)" }}
          aria-labelledby="access-title"
        >
          <p className="eyebrow">Acervo reservado</p>
          <h3
            id="access-title"
            className="mt-5 text-balance"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 3.5vw, 3rem)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            O que está na casa hoje é mostrado em particular.
          </h3>
          <p
            className="mt-6 max-w-md text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            {podeAbrirAcervo
              ? "Seu acesso está pronto. Entre para ver as peças disponíveis, reservadas e o histórico da casa."
              : "Se ainda não tem acesso, envie seu pedido. A casa avalia cada um e entra em contato. Clientes já cadastrados entram pelo mesmo caminho."}
          </p>
          <Link
            href={podeAbrirAcervo ? "/acervo" : "/acesso"}
            className="btn btn-primary group mt-8"
          >
            {podeAbrirAcervo ? "Abrir acervo" : "Solicitar acesso"}
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </aside>
      </div>
    </section>
  );
}