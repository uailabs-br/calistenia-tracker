import { db } from "@/lib/db/schema";

/**
 * Ids de exercício feitos recentemente, do mais novo pro mais antigo, sem
 * repetir. Ignora pulados, registros apagados e sessões apagadas (descartar um
 * treino não deve fazer o que foi descartado aparecer como "recente").
 */
export async function getRecentExerciseIds(limit = 60): Promise<string[]> {
  const sessions = new Map((await db.sessions.toArray()).map((s) => [s.id, s]));
  const logs = (await db.exerciseLogs.toArray())
    .filter((l) => {
      if (l.deleted_at || l.skipped) return false;
      const s = sessions.get(l.session_id);
      return !!s && !s.deleted_at && s.status !== "abandoned";
    })
    .sort((a, b) => b.logged_at - a.logged_at);

  const out: string[] = [];
  const seen = new Set<string>();
  for (const l of logs) {
    if (seen.has(l.exercise_id)) continue;
    seen.add(l.exercise_id);
    out.push(l.exercise_id);
    if (out.length >= limit) break;
  }
  return out;
}
