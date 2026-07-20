import { db } from "@/lib/db/schema";
import { uniqueExercises, negFlagsOf } from "@/lib/plan/loader";
import { isClean } from "./progressionReady";
import { getOverview } from "./metrics";
import { evaluateBadges, type Badge } from "@/lib/domain/badges";

/**
 * Selos derivados dos logs (6.1). Famílias: jornada (nº de treinos),
 * consistência (streak de semanas, de 2.2) e técnica (sessões limpas seguidas
 * de um movimento com neg_flags).
 */
export async function getBadges(): Promise<Badge[]> {
  const sessions = (await db.sessions.toArray())
    .filter((s) => s.status === "completed" && !s.deleted_at)
    .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0)); // recente → antiga

  const logs = (await db.exerciseLogs.toArray()).filter((l) => !l.deleted_at);
  const logsBySession = new Map<string, typeof logs>();
  for (const l of logs) {
    const arr = logsBySession.get(l.session_id) ?? [];
    arr.push(l);
    logsBySession.set(l.session_id, arr);
  }

  const overview = await getOverview();

  // Técnica: para cada movimento com neg_flags, sequência de sessões limpas
  // mais recentes (para na 1ª suja).
  const cleanStreaks = uniqueExercises()
    .map((ex) => ({ ex, negFlags: negFlagsOf(ex.id) }))
    .filter(({ negFlags }) => negFlags.length > 0)
    .map(({ ex, negFlags }) => {
      let streak = 0;
      for (const session of sessions) {
        const log = (logsBySession.get(session.id) ?? []).find(
          (l) => l.exercise_id === ex.id
        );
        if (!log || log.skipped) continue; // não feito nessa sessão
        if (!isClean(log, negFlags)) break;
        streak++;
      }
      return { id: ex.id, name: ex.name, streak };
    });

  return evaluateBadges({
    totalWorkouts: sessions.length,
    longestStreak: overview.longestStreak,
    cleanStreaks,
  });
}
