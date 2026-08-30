/**
 * Espera do acervo.
 *
 * A lista é renderizada na hora e assina cada foto a cada visita (o bucket é
 * privado), então há um intervalo real entre o toque e a tela. Sem isto, o
 * navegador segurava a página anterior e nada indicava que algo estava
 * acontecendo.
 *
 * O esqueleto repete a geometria da grade — 4:5, três colunas no desktop — de
 * modo que a chegada das peças não empurre nada de lugar.
 */

export default function CarregandoAcervo() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <div className="flex max-w-4xl flex-col gap-6">
        <Barra className="h-12 w-[min(28rem,80%)] md:h-16" />
        <Barra className="h-4 w-[min(20rem,60%)]" />
      </div>

      <div
        className="mt-12 flex items-center justify-between border-y py-4"
        style={{ borderColor: "var(--color-border)" }}
      >
        <Barra className="h-3.5 w-40" />
        <Barra className="h-[42px] w-28" />
      </div>

      <ul
        className="mt-10 grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex justify-center">
            <div className="w-full max-w-[21rem] sm:w-[18rem] md:w-[23rem]">
              <Barra className="aspect-[4/5] w-full" />
              <div className="mt-5 flex flex-col gap-2.5">
                <Barra className="h-3 w-24" />
                <Barra className="h-5 w-3/4" />
                <Barra className="h-3.5 w-28" />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <span className="sr-only" role="status">
        Carregando o acervo.
      </span>
    </section>
  );
}

/**
 * Uma placa de espera. Pulsa devagar — e não pulsa para quem pediu menos
 * movimento (a classe `animate-pulse` do Tailwind já respeita a preferência
 * pela regra global de `globals.css`).
 */
function Barra({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse ${className}`}
      style={{ background: "var(--color-surface)" }}
    />
  );
}
