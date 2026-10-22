/**
 * Estado local do aviso de "trocar de treino": quando o plano foi trocado pela
 * última vez e o que a pessoa já dispensou. Fora do Dexie de propósito (é por
 * aparelho, como a dispensa de progressão) — o banco não muda.
 */
export const PLAN_APPLIED_KEY = "calistenia:plan-applied-at";
export const SWAP_ACK_KEY = "calistenia:plan-swap-ack";

function get(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage cheio/bloqueado: o aviso só não lembra */
  }
}

/** Instante (ms) da última troca explícita de plano, ou null se nunca houve. */
export function getPlanAppliedAt(): number | null {
  const raw = get(PLAN_APPLIED_KEY);
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Plano novo zera a dispensa do aviso: os ids de exercício são slugs que
 * atravessam planos, e um "já vi" dado ao plano anterior calaria o aviso do novo.
 */
export function markPlanApplied(at: number = Date.now()): void {
  set(PLAN_APPLIED_KEY, String(at));
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SWAP_ACK_KEY);
  } catch {
    /* idem */
  }
}

export function getSwapAck(): string[] {
  const raw = get(SWAP_ACK_KEY);
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function ackSwap(readyIds: string[]): void {
  set(SWAP_ACK_KEY, JSON.stringify(readyIds));
}
