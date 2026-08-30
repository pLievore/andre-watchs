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
  /*
   * Os quadros do hero são imutáveis — o nome do arquivo é o conteúdo.
   *
   * O padrão da Vercel para `/public` é `max-age=0, must-revalidate`: na
   * segunda visita o navegador tem os 361 arquivos em cache e mesmo assim
   * pergunta ao servidor sobre cada um antes de usar. São 361 idas de rede
   * para não baixar nada — e é isso que faz o hero engasgar de novo em quem
   * já visitou o site.
   *
   * Trocar a sequência exige trocar os nomes (ou o diretório), que é a regra
   * que este cabeçalho assume.
   */
  async headers() {
    return [
      {
        source: "/hero-sequence/:arquivo*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
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
