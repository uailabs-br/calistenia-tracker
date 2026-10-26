import { getWorkoutById } from "@/lib/plan/loader";
import { calibrationFactor, estimateDurationSeconds } from "@/lib/domain/estimateDuration";
import { getCompletedSessions } from "./sessions";

/**
 * Fator que leva a duração estimada pro ritmo real dele: a mesma conta de
 * séries × alvo × descanso erra diferente pra cada pessoa (quem conversa entre
 * séries, quem filma, quem lê a obs). Só treinos do plano vigente medem — avulso
 * não tem estimativa pra comparar.
 */
export async function getDurationFactor(): Promise<number> {
  const sessions = await getCompletedSessions();
  return calibrationFactor(
    sessions.flatMap((s) => {
      const workout = s.workout_id ? getWorkoutById(s.workout_id) : undefined;
      if (!workout || !s.ended_at || !s.started_at) return [];
      return [
        { real: (s.ended_at - s.started_at) / 1000, estimated: estimateDurationSeconds(workout) },
      ];
    })
  );
}
