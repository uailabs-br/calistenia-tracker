import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import { negFlagsOf } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { plannedSets } from "@/lib/domain/volume";

/** Nº de sessões consecutivas no alvo (e limpas) para sugerir subir de nível. */
export const READY_STREAK = 2;

/**
 * Um log "bateu" o alvo: marcado como previsto, ou todas as séries PLANEJADAS
 * ≥ target. Séries extras ficam de fora de propósito: uma 4ª série cansada não
 * pode reprovar um treino que cumpriu o plano.
 */
export function hitTarget(
  log: Pick<ExerciseLog, "as_target" | "sets" | "skipped">,
  target: number | null
): boolean {
  if (log.as_target) return true;
  if (target === null) return false;
  const values = plannedSets(log, null);
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
 * "Pronto pra subir de nível": as últimas READY_STREAK sessões do movimento
 * (ignorando pulos) bateram o alvo de forma limpa. Prima de lastPerformance —
 * segue o MOVIMENTO, não o dia. Conta a sessão em andamento (o aviso aparece ao
 * fim dela) mas não as abandonadas/apagadas. `since` ignora registros até a
 * última dispensa do aviso.
 */
export async function getProgressionReady(
  exerciseId: string,
  since?: number
): Promise<boolean> {
  const sessions: Session[] = (await db.sessions.toArray())
    .filter(
      (s) => !s.deleted_at && (s.status === "completed" || s.status === "in_progress")
    )
    .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));

  const negFlags = negFlagsOf(exerciseId);
  let checked = 0;

  for (const session of sessions) {
    const log = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).find((l) => l.exercise_id === exerciseId && !l.deleted_at);
    if (!log || log.skipped) continue; // não feito nessa sessão
    if (since !== undefined && log.logged_at <= since) continue;

    const target = resolveLogExercise(log, session.weekday).parsed?.target ?? null;
    if (!hitTarget(log, target) || !isClean(log, negFlags)) return false;

    if (++checked >= READY_STREAK) return true;
  }

  return false; // menos de READY_STREAK sessões válidas
}
