/**
 * Espera da página da peça.
 *
 * Mesma razão do esqueleto da lista: a página é montada na hora e as fotos são
 * assinadas a cada visita. O desenho repete o split 60/40 do desktop e a ordem
 * do celular — foto, nome, preço, ação —, para a peça chegar no lugar onde a
 * espera já estava.
 */

export default function CarregandoPeca() {
  return (
    <article className="mx-auto max-w-7xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <Barra className="mb-10 h-3.5 w-24" />

      <div className="grid gap-12 md:grid-cols-[3fr_2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <Barra className="aspect-[4/3] w-full" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Barra key={i} className="aspect-square w-20" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <Barra className="h-3 w-28" />
            <Barra className="h-10 w-4/5 md:h-12" />
            <Barra className="h-3.5 w-2/3" />
          </div>

          <div className="flex flex-col gap-2">
            <Barra className="h-8 w-44" />
            <Barra className="h-3 w-56" />
          </div>

          <div className="flex flex-col gap-4">
            <Barra className="h-12 w-full" />
            <Barra className="h-12 w-full" />
            <Barra className="h-9 w-full" />
          </div>

          <div
            className="flex flex-col gap-6 border-t pt-6"
            style={{ borderColor: "var(--color-border)" }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2.5">
                <Barra className="h-3 w-32" />
                <Barra className="h-3.5 w-full" />
                <Barra className="h-3.5 w-5/6" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Carregando a peça.
      </span>
    </article>
  );
}

function Barra({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse ${className}`}
      style={{ background: "var(--color-surface)" }}
    />
  );
}
