import { db } from "@/lib/db/schema";
import { getLogsForSession } from "@/lib/db/repositories/logs";
import { getCompletedSessions } from "./sessions";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { repsVolume } from "@/lib/domain/volume";

/**
 * Reps da última vez que o mesmo treino (mesma letra) foi concluído antes desta
 * sessão: é a comparação do fim do treino ("+6 vs. último A"). Cada log é lido
 * pelo snapshot (alvo do dia em que foi feito), não pelo plano vigente.
 * null quando não há treino anterior com reps pra comparar.
 */
export async function getPreviousRepsVolume(
  sessionId: string,
  workoutId: string | null
): Promise<number | null> {
  if (!workoutId) return null;
  const current = await db.sessions.get(sessionId);
  const before = current?.started_at ?? Infinity;
  const previous = (await getCompletedSessions())
    .filter((s) => s.id !== sessionId && s.workout_id === workoutId && s.started_at < before)
    .at(-1);
  if (!previous) return null;

  const logs = await getLogsForSession(previous.id);
  const volume = repsVolume(
    logs.map((log) => {
      const ex = resolveLogExercise(log, previous.workout_id);
      return { log, parsed: ex.parsed, target: ex.target };
    })
  );
  return volume > 0 ? volume : null;
}
