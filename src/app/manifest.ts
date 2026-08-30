import type { MetadataRoute } from "next";

/**
 * Manifesto — para o acervo caber na tela de início.
 *
 * O clube já tem a forma de aplicativo: barra inferior de abas, troca por
 * deslize, retorno tátil. O que faltava era o navegador sair da frente.
 * Instalado, ele abre em `standalone` — sem barra de endereço, sem abas —, e a
 * barra da casa ocupa o lugar que era do Safari.
 *
 * `start_url` é a raiz de propósito, não `/acervo`: o cliente ativo é levado
 * ao acervo pelo próprio site, e quem instalar sem ter acesso ainda vê a
 * página da casa em vez de bater numa porta fechada.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ANDRE WATCHES",
    short_name: "Andre Watches",
    description:
      "Acervo de relógios de luxo da Andre Watches. Compra, venda, troca e consignação desde 2012.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    // Papel osso e tinta: as mesmas cores da casa, para a moldura do sistema
    // não destoar do que abre dentro dela.
    background_color: "#faf8f4",
    theme_color: "#faf8f4",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
