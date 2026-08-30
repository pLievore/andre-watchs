import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * O TTF do cartão de compartilhamento é lido em tempo de execução
   * (`opengraph-image.tsx`), e caminho montado na hora é invisível para o
   * rastreador de dependências. Sem esta linha o arquivo não sobe junto com a
   * função e a imagem sai na fonte errada — só em produção.
   */
  outputFileTracingIncludes: {
    "/**": ["./src/app/(site)/fontes/**"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/colecao",
        destination: "/acervo",
        permanent: true,
      },
      {
        source: "/relogios/:slug",
        destination: "/acervo/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
