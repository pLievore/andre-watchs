/**
 * Saudação de boas-vindas do acervo (SPEC D26).
 *
 * Repositório escrito à mão, sorteado por contexto. Sem IA em runtime: custo
 * zero, latência zero, e nenhuma chance de sair uma frase fora de tom num site
 * que vende peça de R$ 200 mil sem ninguém ter revisado.
 *
 * ── TOM (leia antes de acrescentar frase) ───────────────────────────────────
 *
 * Discreto, nunca efusivo. Deve soar como um vendedor experiente recebendo
 * alguém que ele conhece — não como notificação de aplicativo.
 *
 *   PROIBIDO: exclamação, emoji, "incrível", "imperdível", "confira",
 *             "aproveite", qualquer coisa que soe a promoção.
 *   O CLIENTE nunca é apressado. A casa não corre atrás.
 *
 * Frase ruim: "Olá João! 🎉 Confira as novidades incríveis do nosso acervo!"
 * Frase boa:  "Bem-vindo de volta, João. Duas peças entraram desde sua última visita."
 */

export type ContextoSaudacao = {
  /** Primeiro nome. Nome completo numa saudação soa a cadastro, não a acolhida. */
  nome: string;
  /** Nunca acessou antes. */
  primeiraVisita: boolean;
  /** Peças que entraram desde o último acesso. */
  pecasNovas: number;
  /** Dias desde o último acesso. `null` na primeira visita. */
  diasAusente: number | null;
  /** 0–23, para variar por período. */
  hora: number;
};

/** `{nome}` e `{n}` são substituídos na hora. */
type Frase = string;

const PRIMEIRA_VISITA: Frase[] = [
  "Bem-vindo, {nome}. O que está aqui é o acervo da casa hoje.",
  "{nome}, seja bem-vindo. Cada peça abaixo passou pela bancada antes de entrar.",
  "Bem-vindo, {nome}. O que está no acervo hoje foi escolhido a dedo.",
  "{nome}, o acesso está liberado. Fique à vontade.",
  "Bem-vindo, {nome}. Qualquer peça daqui pode virar conversa.",
];

const PECAS_NOVAS_UMA: Frase[] = [
  "{nome}, entrou uma peça desde sua última visita.",
  "Bem-vindo de volta, {nome}. Há uma peça nova no acervo.",
  "{nome}, uma peça nova desde a última vez que você esteve aqui.",
];

const PECAS_NOVAS_VARIAS: Frase[] = [
  "{nome}, entraram {n} peças desde sua última visita.",
  "Bem-vindo de volta, {nome}. {n} peças novas no acervo.",
  "{nome}, o acervo recebeu {n} peças desde a última vez.",
];

const AUSENTE_MUITO: Frase[] = [
  "Faz um tempo, {nome}. O acervo mudou.",
  "Bem-vindo de volta, {nome}. Muita coisa passou por aqui nesse meio-tempo.",
  "{nome}, há algum tempo. Vale rever o acervo.",
];

const MADRUGADA: Frase[] = [
  "Boa madrugada, {nome}.",
  "{nome}, o acervo não dorme.",
  "Boa madrugada, {nome}. O acervo está aqui.",
];

const MANHA: Frase[] = [
  "Bom dia, {nome}.",
  "Bom dia, {nome}. O acervo está abaixo.",
  "{nome}, bom dia. Fique à vontade.",
];

const TARDE: Frase[] = [
  "Boa tarde, {nome}.",
  "Boa tarde, {nome}. O acervo está abaixo.",
  "{nome}, boa tarde. Fique à vontade.",
];

const NOITE: Frase[] = [
  "Boa noite, {nome}.",
  "Boa noite, {nome}. O acervo está abaixo.",
  "{nome}, boa noite. Fique à vontade.",
];

const PADRAO: Frase[] = [
  "Bem-vindo de volta, {nome}.",
  "{nome}, bom te ver por aqui.",
  "Bem-vindo de volta, {nome}. O acervo está abaixo.",
  "{nome}, o acervo da casa.",
];

/** Primeiro nome — "João Carlos da Silva" vira "João". */
function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

function porPeriodo(hora: number): Frase[] {
  if (hora < 5) return MADRUGADA;
  if (hora < 12) return MANHA;
  if (hora < 18) return TARDE;
  return NOITE;
}

/**
 * Escolhe o conjunto pelo contexto mais específico disponível.
 *
 * A ordem é a hierarquia de relevância: peça nova é a informação mais útil que
 * a casa tem para dar, e ganha da hora do dia. Sem isso a saudação vira
 * cumprimento genérico e o cliente perde a informação que o traria de volta.
 */
function escolherConjunto(ctx: ContextoSaudacao): Frase[] {
  if (ctx.primeiraVisita) return PRIMEIRA_VISITA;
  if (ctx.pecasNovas === 1) return PECAS_NOVAS_UMA;
  if (ctx.pecasNovas > 1) return PECAS_NOVAS_VARIAS;
  if (ctx.diasAusente !== null && ctx.diasAusente >= 45) return AUSENTE_MUITO;

  // Sem nada a dizer de específico, varia pelo período — mas não sempre, senão
  // quem entra toda manhã lê "Bom dia" pelo resto da vida.
  return Math.random() < 0.6 ? porPeriodo(ctx.hora) : PADRAO;
}

export function montarSaudacao(ctx: ContextoSaudacao): string {
  const conjunto = escolherConjunto(ctx);
  const frase = conjunto[Math.floor(Math.random() * conjunto.length)] ?? PADRAO[0]!;

  return frase
    .replace("{nome}", primeiroNome(ctx.nome))
    .replace("{n}", String(ctx.pecasNovas));
}
