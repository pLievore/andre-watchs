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
      /*
       * Um endereço só para a casa: `www` cai no domínio raiz.
       *
       * O raiz é o canônico porque é o que o `metadataBase` assina, o que vai
       * no cartão de compartilhamento e o que sai no convite por WhatsApp.
       * Dois endereços vivos dividiriam link, histórico e sessão — e sessão
       * dividida em domínio de clube fechado é gente pedindo senha de novo
       * sem entender por quê.
       */
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.andrewatches.com.br" }],
        destination: "https://andrewatches.com.br/:path*",
        permanent: true,
      },
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
