import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import { negFlagsOf } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { targetValue } from "@/lib/domain/parseTarget";
import { plannedSets } from "@/lib/domain/volume";
import { READY_STREAK, positiveStreak, type Vote } from "@/lib/domain/progressionState";

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
 * Votos do motor genérico de um movimento, do mais recente pro mais antigo,
 * sobre dados JÁ carregados: cada sessão em que ele foi feito (ignorando pulos)
 * vota "bateu o alvo de forma limpa" ou não. Conta a sessão em andamento (o aviso
 * aparece ao fim dela) mas não as abandonadas/apagadas. `since` ignora registros
 * até a última dispensa do aviso.
 */
export function genericVotes(
  exerciseId: string,
  logs: ExerciseLog[],
  sessions: Map<string, Session>,
  since?: number
): (Vote & { date: string })[] {
  const negFlags = negFlagsOf(exerciseId);
  const entries: { log: ExerciseLog; session: Session }[] = [];
  for (const log of logs) {
    if (log.exercise_id !== exerciseId || log.deleted_at || log.skipped) continue;
    if (since !== undefined && log.logged_at <= since) continue;
    const session = sessions.get(log.session_id);
    if (!session || session.deleted_at) continue;
    if (session.status !== "completed" && session.status !== "in_progress") continue;
    entries.push({ log, session });
  }
  entries.sort((a, b) => (b.session.started_at ?? 0) - (a.session.started_at ?? 0));

  return entries.map(({ log, session }) => {
    const resolved = resolveLogExercise(log, session.workout_id);
    const target = targetValue(resolved.parsed, resolved.target);
    const met = hitTarget(log, target) && isClean(log, negFlags);
    return { met, realFailure: !met, date: session.date };
  });
}

/**
 * "Pronto pra subir de nível": as últimas READY_STREAK sessões do movimento
 * bateram o alvo de forma limpa. Prima de lastPerformance — segue o MOVIMENTO,
 * não o dia.
 */
export async function getProgressionReady(
  exerciseId: string,
  since?: number
): Promise<boolean> {
  const logs = await db.exerciseLogs.where("exercise_id").equals(exerciseId).toArray();
  const sessions = new Map((await db.sessions.toArray()).map((s) => [s.id, s]));
  return positiveStreak(genericVotes(exerciseId, logs, sessions, since)) >= READY_STREAK;
}
