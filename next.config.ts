import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
