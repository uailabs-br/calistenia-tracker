/**
 * Dicas de primeiro uso, mostradas uma vez na vida e dispensadas com um toque.
 * Cada uma explica uma interação que o app inventou e que quem vem de outro app
 * de treino interpreta ao contrário. Local, por aparelho, fora do backup.
 */
export type CoachId = "target" | "one-tap" | "flags";

/** Ordem em que a pessoa encontra cada coisa no cartão, de cima pra baixo. */
export const COACH_ORDER: CoachId[] = ["target", "one-tap", "flags"];

export const COACH_COPY: Record<CoachId, string> = {
  target:
    "O alvo vem do plano. Não é um recorde a bater: pare antes de a técnica piorar.",
  "one-tap":
    "Fez as séries como o alvo? Um toque grava tudo. Só use “Ajustar” se foi diferente.",
  flags:
    "Marcar um problema não é errar: é assim que o app vê se o seu padrão está melhorando. Marque com sinceridade.",
};

const KEY = "calistenia:coach-marks";

/**
 * A dica a mostrar agora: a primeira da ordem que se aplica a este cartão e
 * ainda não foi vista. Uma por vez, pra não empilhar três avisos num cartão.
 */
export function pickCoachMark(applicable: CoachId[], seen: readonly string[]): CoachId | null {
  return COACH_ORDER.find((id) => applicable.includes(id) && !seen.includes(id)) ?? null;
}

export function getSeenMarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markSeen(id: CoachId): string[] {
  const next = [...new Set([...getSeenMarks(), id])];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sem storage: a dica volta na próxima abertura, sem quebrar nada */
  }
  return next;
}
