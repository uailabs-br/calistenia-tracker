import { db } from "@/lib/db/schema";
import { getOverview } from "./metrics";
import { evaluateBadges, type Badge } from "@/lib/domain/badges";

/**
 * Selos derivados dos logs (6.1). Famílias: jornada (nº de treinos) e
 * consistência (streak de semanas, de 2.2).
 */
export async function getBadges(): Promise<Badge[]> {
  const totalWorkouts = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  ).length;

  const overview = await getOverview();

  return evaluateBadges({
    totalWorkouts,
    longestStreak: overview.longestStreak,
  });
}
