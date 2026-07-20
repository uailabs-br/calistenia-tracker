import { db } from "@/lib/db/schema";
import { getExerciseInDay, negFlagsOf } from "@/lib/plan/loader";
import { hitTarget, isClean } from "./progressionReady";

/**
 * Data (dateKey) do 1º sucesso limpo de cada movimento pedido — Map id→data.
 * "Sucesso limpo" = bateu o alvo sem flag negativa (mesma regra de 4.1).
 * Segue o MOVIMENTO entre dias. Ausente do Map = ainda não conquistado.
 */
export async function getFirstCleanSuccess(
  exerciseIds: string[]
): Promise<Map<string, string>> {
  const ids = new Set(exerciseIds);
  const sessions = (await db.sessions.toArray())
    .filter((s) => s.status === "completed" && !s.deleted_at)
    .sort((a, b) => (a.started_at ?? 0) - (b.started_at ?? 0)); // asc: 1ª vez

  const result = new Map<string, string>();
  for (const session of sessions) {
    const logs = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).filter((l) => !l.deleted_at && !l.skipped && ids.has(l.exercise_id));
    for (const log of logs) {
      if (result.has(log.exercise_id)) continue;
      const target =
        getExerciseInDay(session.weekday, log.exercise_id)?.parsed?.target ?? null;
      if (hitTarget(log, target) && isClean(log, negFlagsOf(log.exercise_id))) {
        result.set(log.exercise_id, session.date);
      }
    }
  }
  return result;
}
