"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getDayByWeekday } from "@/lib/plan/loader";
import { getActiveSession } from "@/lib/db/repositories/sessions";
import {
  getOverview,
  getWeekStatus,
  getHeroEvolution,
} from "@/lib/db/queries/metrics";
import { weekdayOf, localDateKey } from "@/lib/utils/date";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { ResumeBanner } from "@/components/home/ResumeBanner";
import { TodayCard } from "@/components/home/TodayCard";
import { WeekStrip } from "@/components/home/WeekStrip";
import { ConsistencyCard } from "@/components/home/ConsistencyCard";
import { WeekReviewCard } from "@/components/home/WeekReviewCard";
import { HomeMetrics } from "@/components/home/HomeMetrics";
import { InstallPrompt } from "@/components/ui/InstallPrompt";

export default function HomePage() {
  const today = weekdayOf();
  const todayKey = localDateKey();
  const todayDay = getDayByWeekday(today) ?? null;

  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);
  const overview = useLiveQuery(() => getOverview(), []);
  const weekStatus = useLiveQuery(() => getWeekStatus(), []);
  const hero = useLiveQuery(async () => (await getHeroEvolution()) ?? null, []);

  const completedToday = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return rows.some(
      (s) => s.status === "completed" && !s.deleted_at && s.weekday === today
    );
  }, [todayKey, today]);

  const activeDay = active ? getDayByWeekday(active.weekday) : undefined;

  return (
    <div className="px-4">
      <HomeGreeting />

      <InstallPrompt />

      {active && activeDay && <ResumeBanner day={activeDay} />}

      {/* Feedback da última semana: só na 1ª abertura de cada semana nova */}
      <WeekReviewCard />

      {/* Constância primeiro: resultado atual em 1 olhada */}
      {weekStatus && (
        <div className="mb-4">
          <ConsistencyCard
            streak={overview?.currentStreak ?? 0}
            weekStatus={weekStatus}
          />
        </div>
      )}

      <TodayCard
        day={todayDay}
        today={today}
        completedToday={completedToday ?? false}
        activeToday={active?.weekday === today}
      />

      <WeekStrip today={today} weekStatus={weekStatus} />

      <HomeMetrics
        last30={overview?.last30Workouts ?? 0}
        avgRpe={overview?.avgRpe4w ?? null}
        hero={hero ?? null}
      />

      <div className="h-8" />
    </div>
  );
}
