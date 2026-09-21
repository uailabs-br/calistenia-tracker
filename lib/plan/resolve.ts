import type { ExerciseLog } from "@/lib/db/schema";
import type { Parsed, PlanExercise } from "@/lib/plan/schema";
import { getExerciseById, getExerciseInDay } from "@/lib/plan/loader";

/** Definição de um exercício para ler um log: nome, alvo em texto e `parsed`. */
export interface ResolvedExercise {
  name: string | null;
  target: string;
  parsed: Parsed | null;
}

/**
 * Ponto único de resolução "log → definição do exercício". Ordem:
 * 1. snapshot gravado no log (a verdade do dia em que foi feito);
 * 2. plano vigente, no dia da sessão (logs antigos, sem snapshot);
 * 3. plano vigente, em qualquer dia (o dia da semana pode ter mudado);
 * 4. nada — nome null, sem alvo.
 * Toda query que precisa de nome/alvo/parsed de um log passa por aqui: assim o
 * passado deixa de mudar quando o plano é editado ou substituído.
 */
export function resolveLogExercise(
  log: Pick<ExerciseLog, "exercise_id" | "snapshot">,
  weekday: number
): ResolvedExercise {
  if (log.snapshot) {
    return {
      name: log.snapshot.name,
      target: log.snapshot.target,
      parsed: log.snapshot.parsed,
    };
  }
  const ex: PlanExercise | undefined =
    getExerciseInDay(weekday, log.exercise_id) ?? getExerciseById(log.exercise_id);
  if (ex) return { name: ex.name, target: ex.target, parsed: ex.parsed };
  return { name: null, target: "", parsed: null };
}

/** Snapshot pronto pra gravar no log a partir do exercício do plano. */
export function snapshotOf(
  ex: Pick<PlanExercise, "name" | "target" | "parsed">
): { name: string; target: string; parsed: Parsed | null } {
  return { name: ex.name, target: ex.target, parsed: ex.parsed };
}
