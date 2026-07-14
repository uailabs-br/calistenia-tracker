import type { Parsed } from "@/lib/plan/schema";

/**
 * Reconstitui os valores-alvo por série a partir de `parsed`.
 * Ex: { sets: 4, target: 4 } → [4, 4, 4, 4]
 * Retorna [] quando parsed é null (exercício sem stepper).
 */
export function targetSets(parsed: Parsed | null): number[] {
  if (!parsed) return [];
  return Array.from({ length: parsed.sets }, () => parsed.target);
}

/**
 * Valores iniciais dos steppers ao ajustar. Diferente de `targetSets`,
 * sempre devolve ao menos uma série - mesmo sem `parsed` - para que
 * qualquer exercício possa ter as reps realizadas ajustadas.
 */
export function adjustSets(parsed: Parsed | null): number[] {
  const t = targetSets(parsed);
  return t.length > 0 ? t : [1];
}

/** Rótulo curto de unidade para exibição junto ao stepper. */
export function unitLabel(parsed: Parsed | null): string {
  if (!parsed) return "";
  switch (parsed.unit) {
    case "reps":
      return "reps";
    case "seconds":
      return "s";
    case "attempts":
      return "tent.";
  }
}

/** Formata um valor de série com a unidade (ex: "20s", "8"). */
export function formatValue(value: number, parsed: Parsed | null): string {
  if (!parsed) return String(value);
  return parsed.unit === "seconds" ? `${value}s` : String(value);
}

/**
 * Extrai os segundos de descanso do texto livre do plano.
 * Ex: "descanso 120s" → 120 · "30-45s entre tentativas" → 45 (limite superior).
 * Retorna null quando não há número plausível.
 */
export function parseRestSeconds(rest: string): number | null {
  const nums = (rest.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n <= 600);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

/** mm:ss a partir de segundos. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}
