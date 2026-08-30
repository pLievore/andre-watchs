import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * A imagem que aparece quando alguém cola o endereço da casa numa conversa.
 *
 * A venda anda pelo WhatsApp, e até aqui o link ia como texto seco. Isto é o
 * cartão de visita dele: papel osso, tinta, monograma e a linha que a casa
 * usa para se apresentar — nada de foto de peça.
 *
 * ⚠️ **Peça nenhuma entra aqui.** O acervo é fechado; uma imagem de
 * compartilhamento com a foto do relógio entregaria a peça a quem só recebeu o
 * link. Por isso as páginas de `/acervo` zeram `openGraph.images` na própria
 * metadata — ver `acervo/page.tsx` e `acervo/[slug]/page.tsx`.
 */

export const alt = "ANDRE WATCHES — relógios de luxo, somente originais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPEL = "#faf8f4";
const TINTA = "#17181a";
const PATINA = "#6e6a63";

/**
 * A serifa vem de um arquivo no repositório, não da rede.
 *
 * O gerador de imagem não enxerga as fontes do sistema: sem embutir uma, o
 * texto sairia na sans padrão, e o cartão da casa não pode chegar ao WhatsApp
 * com outra voz. O TTF está versionado ao lado deste arquivo — buscar de um
 * servidor de fontes a cada render penduraria numa dependência externa uma
 * imagem que precisa sempre existir.
 */
async function serifa(): Promise<ArrayBuffer | null> {
  try {
    /*
     * Leitura de arquivo, não `fetch(new URL(..., import.meta.url))`: aquele
     * padrão é dos exemplos que rodam no runtime Edge, e aqui a rota é Node —
     * onde o `fetch` não abre `file://` e a fonte silenciosamente não chega.
     *
     * Em compensação, caminho montado em tempo de execução é invisível para o
     * rastreador de dependências: sem a entrada em `outputFileTracingIncludes`
     * (ver `next.config.ts`) o TTF fica de fora do deploy e o cartão sai na
     * sans — quebrando só depois de publicado, que é o pior lugar para
     * descobrir.
     */
    const arquivo = await readFile(
      join(process.cwd(), "src/app/(site)/fontes/Newsreader-Regular.ttf"),
    );
    return Uint8Array.from(arquivo).buffer;
  } catch {
    // Sem a fonte a imagem ainda sai, na sans padrão do gerador.
    return null;
  }
}

export default async function Imagem() {
  const fonte = await serifa();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPEL,
          color: TINTA,
          padding: "72px 80px",
          fontFamily: "Newsreader, Georgia, serif",
        }}
      >
        {/* Monograma AW — o mesmo traço do ícone, desenhado à mão em SVG. */}
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke={TINTA}
            strokeWidth="0.8"
            opacity="0.5"
          />
          <path
            d="M4.96 16.7 8.22 7.9l3.26 8.8 2.15-5.8 2.15 5.8 3.26-8.8"
            stroke={TINTA}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.11 13.6h4.22"
            stroke={TINTA}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 900,
            }}
          >
            Relógios de luxo, somente originais.
          </div>
          <div style={{ fontSize: 30, color: PATINA, maxWidth: 820 }}>
            Compra, venda, troca e consignação desde 2012. Procedência conferida
            peça a peça.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `1px solid ${PATINA}`,
            paddingTop: 26,
            fontSize: 24,
            letterSpacing: "0.18em",
            color: PATINA,
          }}
        >
          <span>ANDRE WATCHES</span>
          <span>andrewatches.com.br</span>
        </div>
      </div>
    ),
    {
      ...size,
      ...(fonte
        ? {
            fonts: [
              { name: "Newsreader", data: fonte, style: "normal", weight: 400 as const },
            ],
          }
        : {}),
    },
  );
}
