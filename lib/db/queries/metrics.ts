import { db, type Session, type ExerciseLog } from "@/lib/db/schema";
import {
  getExerciseById,
  getExerciseInDay,
  uniqueExercises,
  plan,
} from "@/lib/plan/loader";
import { totalVolume, effectiveSets } from "@/lib/domain/volume";
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

async function activeLogs(): Promise<ExerciseLog[]> {
  const rows = await db.exerciseLogs.toArray();
  return rows.filter((l) => !l.deleted_at);
}

export interface Overview {
  totalWorkouts: number;
  last30Workouts: number;
  /** Semanas consecutivas batendo a meta semanal, com freeze (ver streak.ts). */
  currentStreak: number;
  longestStreak: number;
  avgRpe4w: number | null;
  adherenceByWeekday: { weekday: number; label: string; pct: number }[];
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
  // Dias executados distintos por semana → meta batida quando ≥ goal.
  const goal = getWeekGoal() ?? plan.days.length;
  const weekDays = new Map<string, Set<number>>();
  for (const s of sessions) {
    const wk = weekStartKey(s.date);
    const set = weekDays.get(wk) ?? new Set<number>();
    set.add(weekdayOf(new Date(s.date + "T00:00:00")));
    weekDays.set(wk, set);
  }
  const currentWeek = weekStartKey(today);
  const metOf = (wk: string) => (weekDays.get(wk)?.size ?? 0) >= goal;

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

  // Aderência por dia da semana: sessões / semanas decorridas desde a 1ª
  const weeksElapsed =
    dates.length > 0
      ? Math.max(1, Math.ceil((daysBetween(dates[0], today) + 1) / 7))
      : 1;
  // Crédito por dia EXECUTADO (não o sugerido pelo plano): um treino adiantado
  // conta no dia em que foi feito. Mesmo cálculo de weekday que getWeekStatus.
  const executedCounts = new Map<number, number>();
  for (const s of sessions) {
    const wd = weekdayOf(new Date(s.date + "T00:00:00"));
    executedCounts.set(wd, (executedCounts.get(wd) ?? 0) + 1);
  }
  const byWeekday = plan.days.map((d) => {
    const count = executedCounts.get(d.weekday) ?? 0;
    return {
      weekday: d.weekday,
      label: d.label,
      pct: Math.min(100, Math.round((count / weeksElapsed) * 100)),
    };
  });

  return {
    totalWorkouts,
    last30Workouts,
    currentStreak,
    longestStreak,
    avgRpe4w,
    adherenceByWeekday: byWeekday,
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
    // parsed do dia da sessão: o alvo pode variar entre dias para o mesmo ID
    const parsed =
      getExerciseInDay(session.weekday, exerciseId)?.parsed ?? null;
    points.push({ date: session.date, volume: totalVolume(log, parsed) });
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
    const parsed = getExerciseInDay(session.weekday, exerciseId)?.parsed ?? null;
    const values = effectiveSets(log, parsed);
    if (values.length === 0) continue;
    points.push({ date: session.date, volume: Math.max(...values) });
  }
  return points;
}

/** Exercícios que já apareceram em alguma sessão (para seletor de volume). */
export async function getLoggedExercises(): Promise<
  { id: string; name: string }[]
> {
  const logs = await activeLogs();
  const ids = [...new Set(logs.filter((l) => !l.skipped).map((l) => l.exercise_id))];
  return ids
    .map((id) => {
      const ex = getExerciseById(id);
      return ex ? { id, name: ex.name } : null;
    })
    .filter((x): x is { id: string; name: string } => x !== null);
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface WeekDayStatus {
  weekday: number;
  label: string;
  isPlanDay: boolean;
  done: boolean;
  isToday: boolean;
}

export interface WeekStatus {
  /** dias distintos treinados na semana atual. */
  done: number;
  /** dias de treino previstos no plano. */
  planTotal: number;
  /** 7 dias (Seg→Dom) com estado para o mini-calendário. */
  days: WeekDayStatus[];
}

/** Estado da semana corrente: dias concluídos vs. plano, para home. */
export async function getWeekStatus(): Promise<WeekStatus> {
  const sessions = await completedSessions();
  const today = localDateKey();
  const monday = weekStartKey(today);
  const todayWeekday = weekdayOf();

  // Datas (weekday real) treinadas nesta semana.
  const doneWeekdays = new Set<number>();
  for (const s of sessions) {
    const diff = daysBetween(monday, s.date);
    if (diff >= 0 && diff <= 6) doneWeekdays.add(weekdayOf(new Date(s.date + "T00:00:00")));
  }

  const planWeekdays = new Set(plan.days.map((d) => d.weekday));
  const planLabelByWeekday = new Map(plan.days.map((d) => [d.weekday, d.label]));

  // Ordem Seg(1)→Dom(0) para o mini-calendário.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const days: WeekDayStatus[] = order.map((weekday) => ({
    weekday,
    label: planLabelByWeekday.get(weekday) ?? WEEKDAY_LABELS[weekday],
    isPlanDay: planWeekdays.has(weekday),
    done: doneWeekdays.has(weekday),
    isToday: weekday === todayWeekday,
  }));

  return {
    done: doneWeekdays.size,
    planTotal: plan.days.length,
    days,
  };
}

export interface HeroEvolution {
  id: string;
  name: string;
  points: VolumePoint[];
  /** variação % da última sessão vs. a anterior (null se não dá pra comparar). */
  deltaPct: number | null;
}

/**
 * Exercício-destaque para a home: o mais registrado (não pulado) em sessões
 * concluídas. Retorna a série de volume e a variação recente. null se não há
 * dados suficientes para uma tendência (< 2 pontos).
 */
export async function getHeroEvolution(): Promise<HeroEvolution | null> {
  const sessions = await completedSessions();
  const sessionIds = new Set(sessions.map((s) => s.id));
  const logs = (await activeLogs()).filter(
    (l) => !l.skipped && sessionIds.has(l.session_id)
  );

  const counts = new Map<string, number>();
  for (const l of logs) counts.set(l.exercise_id, (counts.get(l.exercise_id) ?? 0) + 1);

  let bestId = "";
  let best = 0;
  for (const [id, c] of counts) {
    if (c > best) {
      best = c;
      bestId = id;
    }
  }
  if (!bestId || best < 2) return null;

  const points = await getExerciseVolume(bestId);
  if (points.length < 2) return null;

  const last = points[points.length - 1].volume;
  const prev = points[points.length - 2].volume;
  const deltaPct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;

  return {
    id: bestId,
    name: getExerciseById(bestId)?.name ?? bestId,
    points,
    deltaPct,
  };
}
