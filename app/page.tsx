"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getWorkoutById, plan } from "@/lib/plan/loader";
import { getActiveSession, getLastPlanWorkoutId } from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus } from "@/lib/db/queries/metrics";
import { queueFrom } from "@/lib/domain/nextWorkout";
import { localDateKey, shiftDays } from "@/lib/utils/date";
import type { LoggableDay } from "@/components/home/FreeformLogModal";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { ResumeBanner } from "@/components/home/ResumeBanner";
import { NextWorkoutCard } from "@/components/home/NextWorkoutCard";
import { UpNext } from "@/components/home/UpNext";
import { WeekReviewCard } from "@/components/home/WeekReviewCard";
import { ConsistencyCard } from "@/components/home/ConsistencyCard";
import { FreeformLogCard } from "@/components/home/FreeformLogCard";
import { PlanSwapCard } from "@/components/home/PlanSwapCard";
import { PlanBuilderCard } from "@/components/home/PlanBuilderCard";
import { FeedbackCard } from "@/components/home/FeedbackCard";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { isSeedPlanId } from "@/lib/plan/seeds";
import { getPlanSwapSignal } from "@/lib/db/queries/planSwap";
import { ackSwap } from "@/lib/utils/planSwap";
import { usePlanReady } from "@/lib/utils/usePlanReady";

const PAST_LABELS = ["Ontem", "Anteontem"];

export default function HomePage() {
  const todayKey = localDateKey();
  // `plan` vem do localStorage: nada derivado dele antes do mount (regra 10).
  const planReady = usePlanReady();

  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);
  const overview = useLiveQuery(() => getOverview(), []);
  const weekStatus = useLiveQuery(() => getWeekStatus(), []);

  // Último treino do plano concluído (undefined = ainda carregando). Ele define a fila.
  const lastPlanId = useLiveQuery(() => getLastPlanWorkoutId(), []);
  const queue =
    lastPlanId === undefined ? [] : queueFrom(lastPlanId, plan.workouts);
  const next = queue[0] ?? null;
  const upNext = queue.slice(1);

  const todayRows = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return rows.filter((s) => s.status === "completed" && !s.deleted_at);
  }, [todayKey]);
  const donePlanToday = (todayRows ?? []).filter((s) => s.source === "plan");
  const freeformToday = (todayRows ?? []).find((s) => s.source === "freeform") ?? null;
  const completedToday = donePlanToday.length > 0;
  const doneTodayLabels = donePlanToday
    .map((s) => getWorkoutById(s.workout_id ?? "")?.label)
    .filter((label): label is string => !!label);

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

  const activeWorkout = active?.workout_id ? getWorkoutById(active.workout_id) : undefined;

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
    !active && ((loggableDays?.length ?? 0) > 0 || freeformToday !== null);

  // Criador com IA: só com plano pronto e fora de sessão. Sem nenhum treino
  // feito é a primeira ação (sobe acima do próximo treino); depois, desce.
  // Se o aviso de troca está na tela, ele já leva ao criador: o card genérico sai.
  const [swapAckVersion, setSwapAckVersion] = useState(0);
  const swap = useLiveQuery(
    // Fora de sessão só: o mapa varre o histórico inteiro e re-roda a cada escrita
    // em sessions/logs, e com sessão ativa o aviso nem aparece.
    () => (planReady && active === null ? getPlanSwapSignal() : undefined),
    [planReady, active === null, swapAckVersion]
  );
  const showSwap = planReady && !active && !!swap?.show;
  // Espera o sinal resolver: sem isso o card genérico pisca e some quando o aviso chega.
  const showPlanBuilder =
    planReady &&
    !active &&
    overview !== undefined &&
    isSeedPlanId(plan.id) &&
    swap !== undefined &&
    !showSwap;
  const firstWorkout = overview?.totalWorkouts === 0;

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <HomeGreeting />

      <InstallPrompt />

      {active && activeWorkout && <ResumeBanner workout={activeWorkout} />}

      {/* Feedback da última semana: só na 1ª abertura de cada semana nova */}
      <WeekReviewCard />

      {/* Constância primeiro: resultado atual em 1 olhada */}
      {weekStatus && (
        <ConsistencyCard
          streak={overview?.currentStreak ?? 0}
          weekStatus={weekStatus}
        />
      )}

      {showPlanBuilder && firstWorkout && <PlanBuilderCard first />}

      <NextWorkoutCard
        workout={next}
        activeHere={active?.workout_id === next?.id}
        doneToday={doneTodayLabels}
      />

      {showSwap && swap && (
        <PlanSwapCard
          ready={swap.ready}
          onDismiss={() => {
            ackSwap(swap.readyIds);
            setSwapAckVersion((v) => v + 1);
          }}
        />
      )}

      {showPlanBuilder && !firstWorkout && <PlanBuilderCard first={false} />}

      {showFreeformCard && (
        <FreeformLogCard
          freeformSessionToday={freeformToday}
          loggableDays={loggableDays ?? []}
        />
      )}

      <UpNext queue={upNext} />

      {/* Por último de propósito: convite raro, nunca acima do treino */}
      {planReady && active !== undefined && overview !== undefined && (
        <FeedbackCard
          completed={overview.totalWorkouts}
          planId={plan.id}
          sessionActive={active !== null}
        />
      )}
    </div>
  );
}
