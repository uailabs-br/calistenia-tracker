/**
 * Dia e hora que a pessoa marcou pro próximo treino, no fim do primeiro. Local,
 * fora do backup: é um combinado da semana, não histórico.
 */
export interface NextSession {
  /** dateKey YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
}

const KEY = "calistenia:next-session";

export function getNextSession(): NextSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw.date === "string" && typeof raw.time === "string") return raw;
  } catch {
    /* valor corrompido → sem marcação */
  }
  return null;
}

export function setNextSession(value: NextSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* sem storage: o evento na agenda já cumpre o papel */
  }
}
