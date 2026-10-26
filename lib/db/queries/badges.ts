import { db } from "@/lib/db/schema";
import { getOverview } from "./metrics";
import {
  evaluateBadges,
  highlightBadge,
  type Badge,
  type BadgeHighlight,
  type BadgeStats,
} from "@/lib/domain/badges";
import { getLatestRecord, type LatestRecord } from "./pr";

/**
 * Selos derivados dos logs (6.1). Famílias: jornada (nº de treinos) e
 * consistência (streak de semanas, de 2.2).
 */
export async function getBadges(): Promise<Badge[]> {
  return evaluateBadges(await getBadgeStats());
}

async function getBadgeStats(): Promise<BadgeStats> {
  const totalWorkouts = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  ).length;
  const overview = await getOverview();
  return {
    totalWorkouts,
    longestStreak: overview.longestStreak,
    currentStreak: overview.currentStreak,
  };
}

export interface HomeAchievements {
  badge: BadgeHighlight | null;
  record: LatestRecord | null;
}

/** O card de conquistas da home: o selo mais difícil já ganho e o último recorde. */
export async function getHomeAchievements(): Promise<HomeAchievements> {
  const [stats, record] = await Promise.all([getBadgeStats(), getLatestRecord()]);
  return { badge: highlightBadge(stats), record };
}
