/**
 * Onde a pessoa parou no fluxo de treino com IA (`/config/plano`). O fluxo manda
 * ela pra outro app e espera ela voltar; no iOS o PWA costuma recarregar nessa
 * troca, e sem isto ela cairia na escolha inicial com o rascunho perdido.
 *
 * É estado de UI, não de sessão de treino: fica no localStorage, fora do backup,
 * e expira — quem volta dias depois quer começar de novo, não cair no "colar".
 */

export type AiFlowMode = "novo" | "meu";
export type AiFlowStep = "escolha" | "pronto" | "objetivos" | "escrever" | "copiar" | "colar";

export interface AiFlowSaved {
  mode: AiFlowMode;
  /** Pedido já copiado: a volta da IA cai direto no passo de colar. */
  copied: boolean;
  /** Rascunho do "trazer o meu treino". */
  ownWorkout: string;
  savedAt: number;
}

const KEY = "calistenia:ai-flow";
export const AI_FLOW_TTL_MS = 24 * 60 * 60 * 1000;

/** Sequência de cada caminho. "Passo N de 3" sai daqui. */
export const FLOW_STEPS: Record<AiFlowMode, AiFlowStep[]> = {
  novo: ["objetivos", "copiar", "colar"],
  meu: ["escrever", "copiar", "colar"],
};

export function isAiFlowMode(v: unknown): v is AiFlowMode {
  return v === "novo" || v === "meu";
}

/** Lê o JSON guardado; inválido ou vencido vira `null`. Puro, pra testar sem DOM. */
export function parseAiFlow(raw: string | null, now: number): AiFlowSaved | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<AiFlowSaved>;
    if (!isAiFlowMode(v.mode) || typeof v.savedAt !== "number") return null;
    if (now - v.savedAt > AI_FLOW_TTL_MS || v.savedAt > now) return null;
    return {
      mode: v.mode,
      copied: v.copied === true,
      ownWorkout: typeof v.ownWorkout === "string" ? v.ownWorkout : "",
      savedAt: v.savedAt,
    };
  } catch {
    return null;
  }
}

export function getAiFlow(): AiFlowSaved | null {
  try {
    return parseAiFlow(localStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}

export function saveAiFlow(state: Omit<AiFlowSaved, "savedAt">): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    /* modo privado / storage cheio: o fluxo funciona, só não lembra */
  }
}

export function clearAiFlow(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* idem */
  }
}
