import { headers } from "next/headers";

const DDD_CIDADES: Record<string, string> = {
  "11": "São Paulo - SP",
  "12": "São José dos Campos - SP",
  "13": "Santos - SP",
  "14": "Bauru - SP",
  "15": "Sorocaba - SP",
  "16": "Ribeirão Preto - SP",
  "17": "São José do Rio Preto - SP",
  "18": "Presidente Prudente - SP",
  "19": "Campinas - SP",
  "21": "Rio de Janeiro - RJ",
  "22": "Niterói / Cabo Frio - RJ",
  "24": "Petrópolis - RJ",
  "27": "Vitória - ES",
  "28": "Cachoeiro de Itapemirim - ES",
  "31": "Belo Horizonte - MG",
  "32": "Juiz de Fora - MG",
  "34": "Uberlândia - MG",
  "41": "Curitiba - PR",
  "42": "Ponta Grossa - PR",
  "43": "Londrina - PR",
  "44": "Maringá - PR",
  "47": "Balneário Camboriú / Joinville - SC",
  "48": "Florianópolis - SC",
  "51": "Porto Alegre - RS",
  "54": "Caxias do Sul - RS",
  "61": "Brasília - DF",
  "62": "Goiânia - GO",
  "65": "Cuiabá - MT",
  "67": "Campo Grande - MS",
  "71": "Salvador - BA",
  "81": "Recife - PE",
  "85": "Fortaleza - CE",
  "91": "Belém - PA",
  "92": "Manaus - AM",
};

export async function detectarOrigem(telefone?: string | null): Promise<{
  cidade: string;
  dispositivo: "mobile" | "desktop";
}> {
  let cidade = "São Paulo - SP";
  let dispositivo: "mobile" | "desktop" = "desktop";

  try {
    const h = await headers();
    const userAgent = h.get("user-agent") || "";
    if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) {
      dispositivo = "mobile";
    }

    const cidadeHeader = h.get("x-vercel-ip-city");
    const regiaoHeader = h.get("x-vercel-ip-country-region");

    if (cidadeHeader) {
      const dec = decodeURIComponent(cidadeHeader);
      cidade = regiaoHeader ? `${dec} - ${regiaoHeader}` : dec;
      return { cidade, dispositivo };
    }
  } catch {
    // Fallback silencioso
  }

  // Se não tem header da CDN, deriva do DDD do telefone
  if (telefone) {
    const limpo = telefone.replace(/\D/g, "");
    // Remove 55 se vier com DDI
    const telSemDdi = limpo.startsWith("55") && limpo.length > 9 ? limpo.slice(2) : limpo;
    const ddd = telSemDdi.slice(0, 2);
    if (DDD_CIDADES[ddd]) {
      cidade = DDD_CIDADES[ddd];
    }
  }

  return { cidade, dispositivo };
}