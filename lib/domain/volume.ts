import type { Parsed } from "@/lib/plan/schema";
import type { ExerciseLog } from "@/lib/db/schema";
import {
  adjustSets,
  formatExtras,
  formatSets,
  perSideOf,
  targetSets,
  unitOf,
} from "./parseTarget";

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
 * O registro numa linha: "8/8/6 + extra 5", "como previsto", "3/5 tentativas"
 * ou "pulado". É o mesmo texto no card do treino e no detalhe do histórico.
 */
export function summarizeLog(
  log: SetsLog & Partial<Pick<ExerciseLog, "sets_performed">>,
  parsed: Parsed | null,
  target = ""
): string {
  if (log.skipped) return "pulado";
  if (log.sets_performed?.type === "skill_consistency") {
    const { attempts_good, attempts_total } = log.sets_performed;
    return `${attempts_good}/${attempts_total} tentativas`;
  }
  const extra = formatExtras(extraSets(log), parsed);
  const sets = plannedSets(log, parsed, target);
  if (sets.length === 0) return `${log.as_target ? "como previsto" : "feito"}${extra}`;
  return `${formatSets(sets, parsed)}${extra}`;
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
  return perSideOf(parsed, target) ? sum * 2 : sum;
}

/**
 * Séries planejadas feitas num conjunto de logs (fim de treino). As extras
 * ficam de fora: aparecem à parte, como "+N extra". Tentativas não têm série.
 */
export function plannedSetsCount(entries: RepsVolumeEntry[]): number {
  return entries.reduce((n, { log, parsed, target }) => n + plannedSets(log, parsed, target).length, 0);
}

export interface RepsVolumeEntry {
  log: SetsLog;
  parsed: Parsed | null;
  target: string;
}

/**
 * Reps totais de um conjunto de logs — só unidade "reps" (holds e tentativas não
 * somam no mesmo número). A unidade e o lado vêm do `target` quando `parsed` é
 * null: ignorar esses exercícios subcontava o treino.
 */
export function repsVolume(entries: RepsVolumeEntry[]): number {
  return entries.reduce((sum, { log, parsed, target }) => {
    if (log.skipped || unitOf(parsed, target) !== "reps") return sum;
    return sum + totalVolume(log, parsed, target);
  }, 0);
}
