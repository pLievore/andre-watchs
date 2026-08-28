import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="flex max-w-md flex-col gap-6 text-center">
        <p
          className="label"
        >
          404
        </p>
        <h1
          className="text-balance"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 6vw, 4rem)",
            lineHeight: 1,
          }}
        >
          Página não encontrada.
        </h1>
        <p style={{ color: "var(--color-muted)" }}>
          O endereço que você procura não existe ou a peça já saiu do acervo.
        </p>
        <Link
          href="/acesso"
          className="btn btn-primary self-center"
        >
          Ir para o acesso →
        </Link>
      </div>
    </section>
  );
}
