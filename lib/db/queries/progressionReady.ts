import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import { getExerciseInDay, negFlagsOf } from "@/lib/plan/loader";
import { effectiveSets } from "@/lib/domain/volume";

/** Nº de sessões consecutivas no alvo (e limpas) para sugerir subir de nível. */
export const READY_STREAK = 2;

/** Um log "bateu" o alvo: marcado como previsto, ou todas as séries ≥ target. */
export function hitTarget(
  log: Pick<ExerciseLog, "as_target" | "sets" | "skipped">,
  target: number | null
): boolean {
  if (log.as_target) return true;
  if (target === null) return false;
  const values = effectiveSets(log, null);
  return values.length > 0 && values.every((v) => v >= target);
}

/** Execução limpa: nenhuma flag negativa marcada. */
export function isClean(
  log: Pick<ExerciseLog, "flags_selected">,
  negFlags: string[]
): boolean {
  return !log.flags_selected.some((f) => negFlags.includes(f));
}

/**
 * "Pronto pra subir de nível": as últimas READY_STREAK sessões concluídas do
 * movimento (ignorando pulos) bateram o alvo de forma limpa. Prima de
 * lastPerformance — segue o MOVIMENTO, não o dia.
 */
export async function getProgressionReady(exerciseId: string): Promise<boolean> {
  const sessions: Session[] = (await db.sessions.toArray())
    .filter((s) => s.status === "completed" && !s.deleted_at)
    .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));

  const negFlags = negFlagsOf(exerciseId);
  let checked = 0;

  for (const session of sessions) {
    const log = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).find((l) => l.exercise_id === exerciseId && !l.deleted_at);
    if (!log || log.skipped) continue; // não feito nessa sessão

    const target = getExerciseInDay(session.weekday, exerciseId)?.parsed?.target ?? null;
    if (!hitTarget(log, target) || !isClean(log, negFlags)) return false;

    if (++checked >= READY_STREAK) return true;
  }

  return false; // menos de READY_STREAK sessões válidas
}
