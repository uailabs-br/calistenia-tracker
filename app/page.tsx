"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getDayByWeekday } from "@/lib/plan/loader";
import { getActiveSession } from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus } from "@/lib/db/queries/metrics";
import { weekdayOf, localDateKey, shiftDays } from "@/lib/utils/date";
import type { LoggableDay } from "@/components/home/FreeformLogModal";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { ResumeBanner } from "@/components/home/ResumeBanner";
import { TodayCard } from "@/components/home/TodayCard";
import { WeekStrip } from "@/components/home/WeekStrip";
import { ConsistencyCard } from "@/components/home/ConsistencyCard";
import { WeekReviewCard } from "@/components/home/WeekReviewCard";
import { FreeformLogCard } from "@/components/home/FreeformLogCard";
import { InstallPrompt } from "@/components/ui/InstallPrompt";

const PAST_LABELS = ["Ontem", "Anteontem"];

export default function HomePage() {
  const today = weekdayOf();
  const todayKey = localDateKey();
  const todayDay = getDayByWeekday(today) ?? null;

  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);
  const overview = useLiveQuery(() => getOverview(), []);
  const weekStatus = useLiveQuery(() => getWeekStatus(), []);

  const todaySession = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return (
      rows.find(
        (s) => s.status === "completed" && !s.deleted_at && s.weekday === today
      ) ?? null
    );
  }, [todayKey, today]);
  const completedToday = !!todaySession;

  // Ontem/anteontem tiveram ALGUM treino (plano ou avulso)? Cobre "esqueci de
  // registrar" — o CTA de avulso continua aparecendo pra esses dias mesmo
  // depois de hoje já estar concluído.
  const pastDaysDone = useLiveQuery(async () => {
    const dates = PAST_LABELS.map((_, i) => shiftDays(todayKey, -(i + 1)));
    const rows = await db.sessions.where("date").anyOf(dates).toArray();
    const done = new Set(
      rows.filter((s) => s.status === "completed" && !s.deleted_at).map((s) => s.date)
    );
    return dates.map((date) => done.has(date));
  }, [todayKey]);

  const activeDay = active ? getDayByWeekday(active.weekday) : undefined;

  // Dias (hoje/ontem/anteontem) ainda sem NENHUM treino — oferecidos no
  // modal de treino avulso. undefined enquanto pastDaysDone carrega.
  const loggableDays: LoggableDay[] | undefined =
    pastDaysDone === undefined
      ? undefined
      : [
          ...(completedToday ? [] : [{ daysAgo: 0, label: "Hoje" }]),
          ...PAST_LABELS.map((label, i) => ({ daysAgo: i + 1, label })).filter(
            (_, i) => !pastDaysDone[i]
          ),
        ];

  // Card de avulso: mostra o estado de hoje e/ou o CTA pra dias em aberto;
  // nunca durante uma sessão do plano em andamento.
  const showFreeformCard =
    !active && ((loggableDays?.length ?? 0) > 0 || todaySession?.source === "freeform");

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <HomeGreeting />

      <InstallPrompt />

      {active && activeDay && <ResumeBanner day={activeDay} />}

      {/* Feedback da última semana: só na 1ª abertura de cada semana nova */}
      <WeekReviewCard />

      {/* Constância primeiro: resultado atual em 1 olhada */}
      {weekStatus && (
        <ConsistencyCard
          streak={overview?.currentStreak ?? 0}
          weekStatus={weekStatus}
        />
      )}

      <TodayCard
        day={todayDay}
        today={today}
        completedToday={completedToday}
        activeToday={active?.weekday === today}
      />

      {showFreeformCard && (
        <FreeformLogCard
          freeformSessionToday={
            todaySession?.source === "freeform" ? todaySession : null
          }
          loggableDays={loggableDays ?? []}
        />
      )}

      <WeekStrip today={today} />
    </div>
  );
}
