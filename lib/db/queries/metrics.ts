import { db, type Session, type ExerciseLog } from "@/lib/db/schema";
import { getExerciseById, uniqueExercises, plan } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { totalVolume, effectiveSets } from "@/lib/domain/volume";
import { unitOf } from "@/lib/domain/parseTarget";
import { streakWithFreeze } from "@/lib/domain/streak";
import { getWeekGoal } from "@/lib/utils/profile";
import {
  daysBetween,
  localDateKey,
  shiftDays,
  weekStartKey,
  weekdayOf,
} from "@/lib/utils/date";

async function completedSessions(): Promise<Session[]> {
  const rows = await db.sessions.toArray();
  return rows
    .filter((s) => s.status === "completed" && !s.deleted_at)
    .sort((a, b) => (a.started_at ?? 0) - (b.started_at ?? 0));
}

/** Treinos concluídos (plano + avulso), sem os apagados. */
export async function countCompletedSessions(): Promise<number> {
  return (await completedSessions()).length;
}

async function activeLogs(): Promise<ExerciseLog[]> {
  const rows = await db.exerciseLogs.toArray();
  return rows.filter((l) => !l.deleted_at);
}

export interface Overview {
  totalWorkouts: number;
  /** Dia (dateKey) do treino mais recente, plano ou avulso; null sem nenhum. */
  lastWorkoutDate: string | null;
  last30Workouts: number;
  /** Semanas consecutivas batendo a meta semanal, com freeze (ver streak.ts). */
  currentStreak: number;
  longestStreak: number;
  avgRpe4w: number | null;
  balanceByWorkout: WorkoutBalance[];
}

/** Quantas vezes cada treino do plano foi concluído. */
export interface WorkoutBalance {
  id: string;
  label: string;
  title: string;
  count: number;
  /** frequência: em quantas semanas desde a 1ª sessão este treino foi feito (0–100) */
  pct: number;
  /** último dia em que foi feito (dateKey), ou null se nunca */
  lastDate: string | null;
}

export async function getOverview(): Promise<Overview> {
  const sessions = await completedSessions();
  const dates = [...new Set(sessions.map((s) => s.date))].sort();

  const today = localDateKey();

  // Contagem por TREINO (sessão concluída), não por dia único.
  const totalWorkouts = sessions.length;
  const last30Workouts = sessions.filter(
    (s) => daysBetween(s.date, today) < 30
  ).length;

  // Streak SEMANAL por META (2.2): unidade = semana em que a meta foi batida.
  // Meta = nº de treinos concluídos na semana (plano ou avulso).
  const goal = getWeekGoal() ?? plan.workouts.length;
  const weekCount = new Map<string, number>();
  for (const s of sessions) {
    const wk = weekStartKey(s.date);
    weekCount.set(wk, (weekCount.get(wk) ?? 0) + 1);
  }
  const currentWeek = weekStartKey(today);
  const metOf = (wk: string) => (weekCount.get(wk) ?? 0) >= goal;

  let currentStreak = 0;
  let longestStreak = 0;
  if (dates.length > 0) {
    // semanas passadas (a corrente entra só se já batida — pendente não quebra)
    const weeksMet: boolean[] = [];
    for (
      let wk = weekStartKey(dates[0]);
      daysBetween(wk, currentWeek) > 0;
      wk = shiftDays(wk, 7)
    ) {
      weeksMet.push(metOf(wk));
    }
    if (metOf(currentWeek)) weeksMet.push(true);

    currentStreak = streakWithFreeze(weeksMet);
    let run = 0;
    for (const met of weeksMet) {
      run = met ? run + 1 : 0;
      longestStreak = Math.max(longestStreak, run);
    }
  }

  // RPE médio 4 semanas
  const recent = sessions.filter(
    (s) => daysBetween(s.date, today) < 28 && s.rpe != null
  );
  const avgRpe4w =
    recent.length > 0
      ? Math.round(
          (recent.reduce((a, s) => a + (s.rpe ?? 0), 0) / recent.length) * 10
        ) / 10
      : null;

  // Equilíbrio entre treinos do plano: quantas vezes cada um foi concluído.
  // Avulso fica de fora — não pertence a nenhum treino.
  const planSessions = sessions.filter((s) => s.source === "plan" && s.workout_id);
  const balance: WorkoutBalance[] = plan.workouts.map((w) => {
    const mine = planSessions.filter((s) => s.workout_id === w.id);
    return {
      id: w.id,
      label: w.label,
      title: w.title,
      count: mine.length,
      pct: 0,
      // sessões já vêm em ordem cronológica: a última é a mais recente
      lastDate: mine.length > 0 ? mine[mine.length - 1].date : null,
    };
  });
  // Frequência por semana decorrida desde a 1ª sessão (como antes: a semana
  // conta mesmo sem o treino, então mede o quanto cada um aparece no ritmo).
  const weeksElapsed =
    dates.length > 0
      ? Math.max(1, Math.ceil((daysBetween(dates[0], today) + 1) / 7))
      : 1;
  for (const b of balance) {
    b.pct = Math.min(100, Math.round((b.count / weeksElapsed) * 100));
  }

  return {
    totalWorkouts,
    lastWorkoutDate: dates.length > 0 ? dates[dates.length - 1] : null,
    last30Workouts,
    currentStreak,
    longestStreak,
    avgRpe4w,
    balanceByWorkout: balance,
  };
}

export interface FlagIncidence {
  exerciseId: string;
  exerciseName: string;
  flag: string;
  series: { date: string; occurred: boolean }[];
}

/**
 * Incidência de flags por exercício ao longo das sessões (métrica principal).
 * Para cada (exercício, flag), a série temporal de ocorrência por sessão.
 */
export async function getFlagIncidence(): Promise<FlagIncidence[]> {
  const sessions = await completedSessions();
  const logs = await activeLogs();
  const logsBySession = new Map<string, ExerciseLog[]>();
  for (const l of logs) {
    const arr = logsBySession.get(l.session_id) ?? [];
    arr.push(l);
    logsBySession.set(l.session_id, arr);
  }

  const result: FlagIncidence[] = [];
  // percorre exercícios ÚNICOS (ID compartilhado entre dias conta uma vez)
  for (const ex of uniqueExercises()) {
    if (ex.flags.length === 0) continue;
    for (const flag of ex.flags) {
      const series: { date: string; occurred: boolean }[] = [];
      for (const session of sessions) {
        const log = (logsBySession.get(session.id) ?? []).find(
          (l) => l.exercise_id === ex.id
        );
        if (!log || log.skipped) continue; // exercício não feito nessa sessão
        series.push({
          date: session.date,
          occurred: log.flags_selected.includes(flag),
        });
      }
      // só interessa flags que apareceram ao menos uma vez
      if (series.some((p) => p.occurred)) {
        result.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          flag,
          series,
        });
      }
    }
  }
  return result;
}

export interface VolumePoint {
  date: string;
  volume: number;
}

/** Volume por sessão de um exercício ao longo do tempo. */
export async function getExerciseVolume(
  exerciseId: string
): Promise<VolumePoint[]> {
  const sessions = await completedSessions();
  const logs = await activeLogs();

  const points: VolumePoint[] = [];
  for (const session of sessions) {
    const log = logs.find(
      (l) => l.session_id === session.id && l.exercise_id === exerciseId
    );
    if (!log || log.skipped) continue;
    // alvo do momento do registro (snapshot), não o do plano de hoje
    const ex = resolveLogExercise(log, session.workout_id);
    points.push({
      date: session.date,
      volume: totalVolume(log, ex.parsed, ex.target),
    });
  }
  return points;
}

/**
 * Melhor hold (maior série única, não a soma) por sessão de uma isometria.
 * Métrica-rainha das isometrias (unit "seconds"), separada do volume.
 */
export async function getBestHold(exerciseId: string): Promise<VolumePoint[]> {
  const sessions = await completedSessions();
  const logs = await activeLogs();

  const points: VolumePoint[] = [];
  for (const session of sessions) {
    const log = logs.find(
      (l) => l.session_id === session.id && l.exercise_id === exerciseId
    );
    if (!log || log.skipped) continue;
    const ex = resolveLogExercise(log, session.workout_id);
    const values = effectiveSets(log, ex.parsed, ex.target);
    if (values.length === 0) continue;
    points.push({ date: session.date, volume: Math.max(...values) });
  }
  return points;
}

export interface LoggedExercise {
  id: string;
  name: string;
  /** Unidade do alvo (define se o gráfico é volume ou melhor hold). */
  unit: "reps" | "seconds" | "attempts" | null;
}

/**
 * Exercícios que já apareceram em alguma sessão (para seletor de volume).
 * Nome e unidade vêm do registro mais recente: exercício que saiu do plano (ou
 * foi adicionado fora dele) continua aparecendo, com o nome de quando foi feito.
 */
export async function getLoggedExercises(): Promise<LoggedExercise[]> {
  const logs = (await activeLogs())
    .filter((l) => !l.skipped)
    .sort((a, b) => b.logged_at - a.logged_at);
  const out = new Map<string, LoggedExercise>();
  for (const l of logs) {
    if (out.has(l.exercise_id)) continue;
    const planEx = getExerciseById(l.exercise_id);
    const name = planEx?.name ?? l.snapshot?.name;
    if (!name) continue;
    out.set(l.exercise_id, {
      id: l.exercise_id,
      name,
      // alvo em intervalo tem parsed null: a unidade sai do texto do alvo
      unit: unitOf(
        l.snapshot ? l.snapshot.parsed : (planEx?.parsed ?? null),
        l.snapshot?.target ?? planEx?.target ?? ""
      ),
    });
  }
  return [...out.values()];
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface WeekDayStatus {
  /** 0 = domingo … 6 = sábado */
  weekday: number;
  label: string;
  done: boolean;
  isToday: boolean;
  /** Origem do treino que concluiu o dia; null se o dia não foi treinado. */
  source: "plan" | "freeform" | null;
}

export interface WeekStatus {
  /** treinos concluídos na semana atual (programa + avulso). Conta contra a meta. */
  done: number;
  /** nº de treinos do plano: meta padrão quando o usuário não define outra. */
  planTotal: number;
  /** dentre os `done`, quantos foram avulsos. */
  freeformCount: number;
  /** 7 dias (Seg→Dom) com o que foi feito, para o mini-calendário. */
  days: WeekDayStatus[];
}

/** Estado da semana corrente, para a home. */
export async function getWeekStatus(): Promise<WeekStatus> {
  const sessions = await completedSessions();
  const today = localDateKey();
  const monday = weekStartKey(today);
  const todayWeekday = weekdayOf();

  const thisWeek = sessions.filter((s) => {
    const diff = daysBetween(monday, s.date);
    return diff >= 0 && diff <= 6;
  });

  // Dias (weekday real) treinados nesta semana, com a origem (plano tem
  // prioridade sobre avulso quando o mesmo dia tem os dois).
  const doneWeekdays = new Map<number, "plan" | "freeform">();
  for (const s of thisWeek) {
    const wd = weekdayOf(new Date(s.date + "T00:00:00"));
    const src: "plan" | "freeform" = s.source === "freeform" ? "freeform" : "plan";
    if (doneWeekdays.get(wd) !== "plan") doneWeekdays.set(wd, src);
  }

  // Ordem Seg(1)→Dom(0) para o mini-calendário.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days: WeekDayStatus[] = order.map((weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday],
    done: doneWeekdays.has(weekday),
    isToday: weekday === todayWeekday,
    source: doneWeekdays.get(weekday) ?? null,
  }));

  return {
    done: thisWeek.length,
    planTotal: plan.workouts.length,
    freeformCount: thisWeek.filter((s) => s.source === "freeform").length,
    days,
  };
}

export interface HeatmapDay {
  /** dateKey local YYYY-MM-DD */
  date: string;
  /** treinos concluídos nesse dia (plano + avulso) */
  count: number;
  future: boolean;
  isToday: boolean;
}

/**
 * Calendário de constância: `weeksBack` semanas (a última é a corrente), cada
 * uma com 7 dias Seg→Dom. Devolve semana → dias, na ordem do calendário.
 */
export async function getActivityHeatmap(weeksBack = 12): Promise<HeatmapDay[][]> {
  const sessions = await completedSessions();
  const counts = new Map<string, number>();
  for (const s of sessions) counts.set(s.date, (counts.get(s.date) ?? 0) + 1);

  const today = localDateKey();
  const firstMonday = shiftDays(weekStartKey(today), -7 * (weeksBack - 1));

  return Array.from({ length: weeksBack }, (_, w) => {
    const monday = shiftDays(firstMonday, 7 * w);
    return Array.from({ length: 7 }, (_, d) => {
      const date = shiftDays(monday, d);
      return {
        date,
        count: counts.get(date) ?? 0,
        future: daysBetween(today, date) > 0,
        isToday: date === today,
      };
    });
  });
}
