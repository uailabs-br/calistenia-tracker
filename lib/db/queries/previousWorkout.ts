import { db, type Session } from "@/lib/db/schema";
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
  const volume = await sessionRepsVolume(previous);
  return volume > 0 ? volume : null;
}

/** Reps de uma sessão, cada log lido pelo snapshot (regra 5). */
async function sessionRepsVolume(session: Session): Promise<number> {
  const logs = await getLogsForSession(session.id);
  return repsVolume(
    logs.map((log) => {
      const ex = resolveLogExercise(log, session.workout_id);
      return { log, parsed: ex.parsed, target: ex.target };
    })
  );
}

export interface LastWorkoutRun {
  /** dateKey do dia em que foi feito. */
  date: string;
  minutes: number | null;
  /** null quando o treino não tem reps (só holds, ou nada registrado). */
  reps: number | null;
  rpe: number | null;
}

/**
 * A última vez que este treino (mesma letra) foi concluído: a tela de
 * carregamento mostra quando foi, quanto durou, as reps e o esforço marcado.
 * null na primeira vez.
 */
export async function getLastWorkoutRun(workoutId: string): Promise<LastWorkoutRun | null> {
  const last = (await getCompletedSessions()).filter((s) => s.workout_id === workoutId).at(-1);
  if (!last) return null;
  const reps = await sessionRepsVolume(last);
  return {
    date: last.date,
    minutes: last.ended_at ? Math.max(1, Math.round((last.ended_at - last.started_at) / 60_000)) : null,
    reps: reps > 0 ? reps : null,
    rpe: last.rpe,
  };
}
