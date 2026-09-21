/**
 * Dispensa do "sinal de progressão" (local, por aparelho). Sem isso o aviso
 * "pronto pra subir" reaparecia em toda sessão pra sempre: o nível vem do plano,
 * então nada no app muda quando o usuário decide. Dispensar registra o instante;
 * o motor só volta a considerar registros POSTERIORES a ele — ou seja, o aviso
 * só reaparece se o critério for batido de novo, do zero.
 */

const KEY = "calistenia:progression-acks";

type Acks = Record<string, number>;

/** Chave do aviso: skill+nível (motor estruturado) ou exercício (motor genérico). */
export function ackKeySkill(skillId: string, level: number): string {
  return `skill:${skillId}:${level}`;
}
export function ackKeyExercise(exerciseId: string): string {
  return `ex:${exerciseId}`;
}

function read(): Acks {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Acks) : {};
  } catch {
    return {};
  }
}

/** Instante da última dispensa (ms) ou undefined se nunca dispensado. */
export function ackedAt(key: string): number | undefined {
  const v = read()[key];
  return typeof v === "number" ? v : undefined;
}

export function ackProgression(key: string, at: number = Date.now()): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [key]: at }));
  } catch {
    /* storage cheio/bloqueado: o aviso volta, sem quebrar nada */
  }
}
