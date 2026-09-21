import type { Parsed } from "@/lib/plan/schema";
import type { ExerciseLog } from "@/lib/db/schema";
import { adjustSets, targetSets } from "./parseTarget";

type SetsLog = Pick<ExerciseLog, "as_target" | "sets" | "skipped" | "extra_sets">;

/**
 * Séries PLANEJADAS realizadas (sem as extras) — é o que a progressão compara
 * com o alvo. Uma série extra a mais (ou a menos, cansada) não pode mudar o
 * veredito de "bateu o alvo".
 * - as_target: reconstitui a partir de `parsed` (todas no alvo)
 * - com sets: usa os valores ajustados
 * - skipped ou sem parsed sem sets: []
 */
export function plannedSets(log: SetsLog, parsed: Parsed | null, target = ""): number[] {
  if (log.skipped) return [];
  if (log.as_target) return targetSets(parsed, target);
  if (log.sets && log.sets.length > 0) {
    return log.sets
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((s) => s.value);
  }
  return [];
}

/** Séries extras (feitas além do planejado, durante o treino). Vazio se pulado. */
export function extraSets(log: Pick<ExerciseLog, "skipped" | "extra_sets">): number[] {
  if (log.skipped) return [];
  return (log.extra_sets ?? []).filter((v) => v > 0);
}

/**
 * Todas as séries realizadas: planejadas + extras. É o que conta pra volume,
 * recorde e histórico.
 */
export function effectiveSets(log: SetsLog, parsed: Parsed | null, target = ""): number[] {
  return [...plannedSets(log, parsed, target), ...extraSets(log)];
}

/** Valor sugerido pra próxima série extra: repete a última série feita. */
export function extraSeed(log: SetsLog, parsed: Parsed | null, target = ""): number {
  const all = effectiveSets(log, parsed, target);
  return all.length > 0 ? all[all.length - 1] : adjustSets(parsed, target)[0];
}

/** Volume total (soma das reps/segundos) de um log. per_side dobra o total. */
export function totalVolume(
  log: SetsLog,
  parsed: Parsed | null,
  target = ""
): number {
  const sets = effectiveSets(log, parsed, target);
  const sum = sets.reduce((a, b) => a + b, 0);
  return parsed?.per_side ? sum * 2 : sum;
}
