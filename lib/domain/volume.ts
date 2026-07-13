import type { Parsed } from "@/lib/plan/schema";
import type { ExerciseLog } from "@/lib/db/schema";
import { targetSets } from "./parseTarget";

/**
 * Valores por série efetivamente realizados num log.
 * - as_target: reconstitui a partir de `parsed` (todas no alvo)
 * - com sets: usa os valores ajustados
 * - skipped ou sem parsed sem sets: []
 */
export function effectiveSets(
  log: Pick<ExerciseLog, "as_target" | "sets" | "skipped">,
  parsed: Parsed | null
): number[] {
  if (log.skipped) return [];
  if (log.as_target) return targetSets(parsed);
  if (log.sets && log.sets.length > 0) {
    return log.sets
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((s) => s.value);
  }
  return [];
}

/** Volume total (soma das reps/segundos) de um log. per_side dobra o total. */
export function totalVolume(
  log: Pick<ExerciseLog, "as_target" | "sets" | "skipped">,
  parsed: Parsed | null
): number {
  const sets = effectiveSets(log, parsed);
  const sum = sets.reduce((a, b) => a + b, 0);
  return parsed?.per_side ? sum * 2 : sum;
}
