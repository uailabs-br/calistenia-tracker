import { db, type ExerciseLog } from "@/lib/db/schema";
import type { Parsed } from "@/lib/plan/schema";
import { getExerciseInDay, negFlagsOf } from "@/lib/plan/loader";
import { effectiveSets } from "@/lib/domain/volume";
import { isClean } from "./progressionReady";

/** Métrica-rainha por unidade: maior série de reps ou maior hold único (segundos). */
export interface PRResult {
  value: number;
  unit: "reps" | "seconds";
}

type LogLike = Pick<ExerciseLog, "as_target" | "sets" | "skipped" | "flags_selected">;

function maxSet(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

/** Formata o recorde para o toast (ex.: "18s", "6 reps"). */
export function formatPR(pr: PRResult): string {
  return pr.unit === "seconds" ? `${pr.value}s` : `${pr.value} reps`;
}

/**
 * Recorde no momento do registro. Compara a melhor série do log atual com o
 * melhor histórico LIMPO do movimento. Regras: só conta se limpo; 1ª vez não é
 * PR; empate não é PR; `attempts`/sem `parsed` não têm PR. `per_side` não muda a
 * comparação por série. Retorna null quando não é recorde.
 */
export async function computePR(
  exerciseId: string,
  currentLog: LogLike,
  parsed: Parsed | null
): Promise<PRResult | null> {
  if (currentLog.skipped || !parsed || parsed.unit === "attempts") return null;

  const negFlags = negFlagsOf(exerciseId);
  if (!isClean(currentLog, negFlags)) return null;

  const candidate = maxSet(effectiveSets(currentLog, parsed));
  if (candidate === null) return null;

  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  );

  let prevBest: number | null = null;
  for (const session of sessions) {
    const log = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).find((l) => l.exercise_id === exerciseId && !l.deleted_at);
    if (!log || log.skipped || !isClean(log, negFlags)) continue;
    const p = getExerciseInDay(session.weekday, exerciseId)?.parsed ?? parsed;
    const v = maxSet(effectiveSets(log, p));
    if (v !== null && (prevBest === null || v > prevBest)) prevBest = v;
  }

  if (prevBest === null) return null; // 1ª vez limpa não é recorde
  if (candidate <= prevBest) return null; // empate ou abaixo

  return { value: candidate, unit: parsed.unit };
}
