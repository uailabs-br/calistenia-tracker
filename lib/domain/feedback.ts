/**
 * Feedback sem backend: o app só monta um link pro canal de contato com a
 * mensagem já começada. Pura: quem chama traz o canal e o contexto.
 */

/** Treinos concluídos antes do primeiro convite na home: antes disso não há o que dizer. */
export const FEEDBACK_FIRST_AT = 5;
/** Depois de dispensado (ou enviado), o convite só volta após mais estes treinos. */
export const FEEDBACK_AGAIN_AFTER = 20;

export interface FeedbackContext {
  /** versão curta do app (ex.: "1.8") */
  version: string;
  planId: string;
  workouts: number;
  /** "iPhone", "Android" ou "computador" */
  device: string;
  installed: boolean;
}

/**
 * Rodapé com o contexto que ajuda a reproduzir um problema. Vai visível no fim
 * da mensagem, nunca escondido: a pessoa vê e apaga se quiser.
 */
export function feedbackFooter(ctx: FeedbackContext): string {
  const treinos = `${ctx.workouts} ${ctx.workouts === 1 ? "treino" : "treinos"}`;
  const aparelho = `${ctx.device}${ctx.installed ? ", instalado" : ", no navegador"}`;
  return `v${ctx.version} · treino ${ctx.planId} · ${treinos} · ${aparelho}`;
}

export function feedbackMessage(ctx: FeedbackContext): string {
  return `Oi! Sobre o app:\n\n\n\n—\n${feedbackFooter(ctx)}`;
}

/**
 * Link pronto pro canal. WhatsApp e e-mail aceitam texto pré-preenchido; outro
 * destino (formulário, página) abre como está, porque não há como pré-preencher
 * de forma genérica.
 */
export function buildFeedbackLink(base: string, ctx: FeedbackContext): string {
  const text = encodeURIComponent(feedbackMessage(ctx));
  const sep = base.includes("?") ? "&" : "?";
  if (base.startsWith("mailto:")) {
    const subject = encodeURIComponent("Feedback do app");
    return `${base}${sep}subject=${subject}&body=${text}`;
  }
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|(www\.)?whatsapp\.com)\//.test(base)) {
    return `${base}${sep}text=${text}`;
  }
  return base;
}

export interface FeedbackPromptInput {
  /** treinos concluídos (plano + avulso) */
  completed: number;
  /** nº de treinos no momento em que o convite foi dispensado; null se nunca foi */
  ackedAt: number | null;
  sessionActive: boolean;
}

/** Convite na home: nunca com sessão aberta, só depois de uso real, e raro. */
export function shouldPromptFeedback({ completed, ackedAt, sessionActive }: FeedbackPromptInput): boolean {
  if (sessionActive) return false;
  if (completed < FEEDBACK_FIRST_AT) return false;
  return ackedAt === null || completed >= ackedAt + FEEDBACK_AGAIN_AFTER;
}
