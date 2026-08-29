import { usuarioAdmin } from "@/lib/db/admin-auth";
import {
  contarPecasDesde,
  listarPecasDoCliente,
} from "@/lib/db/pecas-sessao";
import { clienteAtual } from "@/lib/db/server";
import { montarSaudacao } from "@/lib/saudacao";

const DIA_MS = 24 * 60 * 60 * 1000;

function diasDesde(valor: string | null, agora: Date): number | null {
  if (!valor) return null;
  const instante = Date.parse(valor);
  if (Number.isNaN(instante)) return null;
  return Math.max(0, Math.floor((agora.getTime() - instante) / DIA_MS));
}

function horaEmSaoPaulo(agora: Date): number {
  const hora = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Sao_Paulo",
  }).format(agora);
  return Number.parseInt(hora, 10);
}

export async function carregarDadosSite(searchParams?: { [key: string]: string | string[] | undefined }) {
  const [admin, cliente] = await Promise.all([
    usuarioAdmin(),
    clienteAtual(),
  ]);

  const [pecas, pecasNovas] = await Promise.all([
    listarPecasDoCliente(),
    cliente ? contarPecasDesde(cliente.ultimo_acesso) : Promise.resolve(0),
  ]);

  const agora = new Date();
  const saudacao = cliente
    ? montarSaudacao({
        nome: cliente.nome,
        primeiraVisita: cliente.ultimo_acesso === null,
        pecasNovas,
        diasAusente: diasDesde(cliente.ultimo_acesso, agora),
        hora: horaEmSaoPaulo(agora),
      })
    : "O acervo da casa.";

  const boasVindas =
    searchParams?.["boas-vindas"] === "1" || searchParams?.convite === "1";

  return {
    isAdmin: Boolean(admin),
    cliente: cliente
      ? {
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone ?? "",
        }
      : null,
    pecas,
    saudacao,
    boasVindas,
  };
}

export type DadosSite = Awaited<ReturnType<typeof carregarDadosSite>>;
