"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getCompletedSessions,
  getCompletedSessionsOn,
  hadCompletedSession,
} from "@/lib/db/queries/sessions";
import { getWorkoutById, plan } from "@/lib/plan/loader";
import { getActiveSession, getLastPlanWorkoutId } from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus } from "@/lib/db/queries/metrics";
import { queueFrom } from "@/lib/domain/nextWorkout";
import { daysBetween, localDateKey, shiftDays } from "@/lib/utils/date";
import { RETURN_AFTER_DAYS } from "@/lib/domain/returnNudge";
import { firstWeek } from "@/lib/domain/firstWeek";
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
import { ReturnCard } from "@/components/home/ReturnCard";
import { FirstWeekCard } from "@/components/home/FirstWeekCard";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { isSeedPlanId } from "@/lib/plan/seeds";
import { getPlanSwapSignal } from "@/lib/db/queries/planSwap";
import { ackSwap } from "@/lib/utils/planSwap";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import { useDelayedFlag } from "@/lib/utils/useDelayedFlag";
import { getHomeAchievements } from "@/lib/db/queries/badges";
import { AchievementsCard } from "@/components/home/AchievementsCard";
import { HomeSkeleton } from "@/components/ui/Skeleton";

const PAST_LABELS = ["Ontem", "Anteontem"];

export default function HomePage() {
  const todayKey = localDateKey();
  // `plan` vem do localStorage: nada derivado dele antes do mount (regra 10).
  const planReady = usePlanReady();

  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);
  const overview = useLiveQuery(() => getOverview(), []);
  const weekStatus = useLiveQuery(() => getWeekStatus(), []);
  const achievements = useLiveQuery(() => getHomeAchievements(), []);
  const completed = useLiveQuery(() => getCompletedSessions(), []);

  // Último treino do plano concluído (undefined = ainda carregando). Ele define a fila.
  const lastPlanId = useLiveQuery(() => getLastPlanWorkoutId(), []);
  const queue =
    lastPlanId === undefined ? [] : queueFrom(lastPlanId, plan.workouts);
  const next = queue[0] ?? null;
  const upNext = queue.slice(1);

  const todayRows = useLiveQuery(() => getCompletedSessionsOn(todayKey), [todayKey]);
  const donePlanToday = (todayRows ?? []).filter((s) => s.source === "plan");
  const freeformToday = (todayRows ?? []).find((s) => s.source === "freeform") ?? null;
  const completedToday = donePlanToday.length > 0;
  const doneTodayLabels = donePlanToday
    .map((s) => getWorkoutById(s.workout_id ?? "")?.label)
    .filter((label): label is string => !!label);

  // Ontem/anteontem tiveram ALGUM treino (plano ou avulso)? Cobre "esqueci de
  // registrar" — o CTA de avulso continua aparecendo pra esses dias mesmo
  // depois de hoje já estar concluído.
  const pastDaysDone = useLiveQuery(
    () => hadCompletedSession(PAST_LABELS.map((_, i) => shiftDays(todayKey, -(i + 1)))),
    [todayKey]
  );

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

  // Antes do primeiro treino a home é só o treino: tudo que tira a pessoa dele
  // (criar plano com IA, registrar avulso, instalar) espera o primeiro concluído.
  const firstWorkout = overview?.totalWorkouts === 0;

  // Card de avulso: mostra o estado de hoje e/ou o CTA pra dias em aberto;
  // nunca durante uma sessão do plano em andamento.
  const showFreeformCard =
    !active && !firstWorkout && ((loggableDays?.length ?? 0) > 0 || freeformToday !== null);

  // Criador com IA: só com plano pronto, fora de sessão e depois do primeiro treino.
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
    !showSwap &&
    !firstWorkout;

  // Primeira semana: a lista "montar o plano + cada treino" toma o lugar da constância.
  const week =
    planReady && completed !== undefined
      ? firstWeek({ sessions: completed, workouts: plan.workouts, today: todayKey })
      : null;

  // Pausa longa: o card de volta aparece e o botão do treino fala em voltar.
  const returning =
    !active &&
    !!overview?.lastWorkoutDate &&
    daysBetween(overview.lastWorkoutDate, todayKey) >= RETURN_AFTER_DAYS;

  // Tudo que a tela mostra de cima a baixo entra junto: card por card, a home
  // montava em degraus e o próximo treino pulava de lugar quando a constância chegava.
  const loading =
    !planReady ||
    active === undefined ||
    overview === undefined ||
    weekStatus === undefined ||
    lastPlanId === undefined ||
    achievements === undefined ||
    completed === undefined;
  const showSkeleton = useDelayedFlag(loading);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 px-4 pb-8">
        <HomeGreeting />
        {showSkeleton && <HomeSkeleton />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <HomeGreeting />

      {/* A instalação é pedida no fim do primeiro treino, com o motivo; daí em diante, aqui. */}
      {!firstWorkout && <InstallPrompt />}

      {active && activeWorkout && <ResumeBanner workout={activeWorkout} />}

      {returning && (
        <ReturnCard lastWorkoutDate={overview.lastWorkoutDate} planTotal={weekStatus.planTotal} />
      )}

      {/* Estreante e quem volta de pausa: o treino sobe pro topo, antes dos números */}
      {(firstWorkout || returning) && (
        <NextWorkoutCard
          workout={next}
          activeHere={active?.workout_id === next?.id}
          doneToday={doneTodayLabels}
          first={firstWorkout}
          returning={returning}
        />
      )}

      {/* Semana passada: até tocar em "Começar nova semana" ou concluir o 1º treino da semana */}
      <WeekReviewCard
        streak={overview.currentStreak}
        weekStarted={weekStatus.done > 0}
        next={next}
      />

      {/* Constância primeiro: resultado atual em 1 olhada. Na primeira semana, a lista. */}
      {week ? (
        <FirstWeekCard week={week} />
      ) : (
        <ConsistencyCard streak={overview.currentStreak} weekStatus={weekStatus} />
      )}

      {/* Logo abaixo da constância: a semana diz como vai, isto diz até onde chegou */}
      <AchievementsCard data={achievements} />

      {!firstWorkout && !returning && (
        <NextWorkoutCard
          workout={next}
          activeHere={active?.workout_id === next?.id}
          doneToday={doneTodayLabels}
        />
      )}

      {showSwap && swap && (
        <PlanSwapCard
          ready={swap.ready}
          onDismiss={() => {
            ackSwap(swap.readyIds);
            setSwapAckVersion((v) => v + 1);
          }}
        />
      )}

      {showPlanBuilder && <PlanBuilderCard />}

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
