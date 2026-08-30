/**
 * Espera da conta do cliente.
 *
 * Existe para a conta não herdar o esqueleto da lista (`acervo/loading.tsx`),
 * que desenharia uma grade de peças antes de abrir um formulário — promessa
 * errada, e o pior tipo de espera é a que mostra outra coisa.
 */

export default function CarregandoConta() {
  return (
    <section className="mx-auto max-w-2xl px-6 pb-24 pt-32 md:px-16 md:pb-32 md:pt-44">
      <div className="flex flex-col gap-3">
        <Barra className="h-3 w-24" />
        <Barra className="h-10 w-2/3 md:h-12" />
      </div>

      <div className="mt-12 flex flex-col gap-10">
        {Array.from({ length: 2 }).map((_, bloco) => (
          <div
            key={bloco}
            className="flex flex-col gap-5 border-t pt-8"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Barra className="h-3.5 w-40" />
            {Array.from({ length: 2 }).map((_, campo) => (
              <div key={campo} className="flex flex-col gap-2">
                <Barra className="h-3 w-28" />
                <Barra className="h-11 w-full" />
              </div>
            ))}
            <Barra className="h-11 w-40" />
          </div>
        ))}
      </div>

      <span className="sr-only" role="status">
        Carregando sua conta.
      </span>
    </section>
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
