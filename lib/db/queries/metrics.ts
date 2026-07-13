import { db, type Session, type ExerciseLog } from "@/lib/db/schema";
import { getExerciseById, plan } from "@/lib/plan/loader";
import { totalVolume } from "@/lib/domain/volume";
import { daysBetween, localDateKey } from "@/lib/utils/date";

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
  totalDays: number;
  last30: number;
  currentStreak: number;
  longestStreak: number;
  avgRpe4w: number | null;
  adherenceByWeekday: { weekday: number; label: string; pct: number }[];
}

export async function getOverview(): Promise<Overview> {
  const sessions = await completedSessions();
  const dates = [...new Set(sessions.map((s) => s.date))].sort();

  const today = localDateKey();
  const last30 = dates.filter((d) => daysBetween(d, today) < 30).length;

  // Streak: dias consecutivos com treino terminando em hoje ou ontem
  const dateSet = new Set(dates);
  let currentStreak = 0;
  {
    const cursor = new Date();
    // se não treinou hoje, começa de ontem
    if (!dateSet.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(localDateKey(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Maior streak histórico
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    if (prev && daysBetween(prev, d) === 1) run++;
    else run = 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
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
  const planWeekdays = new Set(plan.days.map((d) => d.weekday));
  const byWeekday = plan.days.map((d) => {
    const count = sessions.filter((s) => s.weekday === d.weekday).length;
    return {
      weekday: d.weekday,
      label: d.label,
      pct: Math.min(100, Math.round((count / weeksElapsed) * 100)),
    };
  });
  void planWeekdays;

  return {
    totalDays: dates.length,
    last30,
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
  // percorre exercícios do plano que têm flags
  for (const day of plan.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
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
  const ex = getExerciseById(exerciseId);
  const parsed = ex?.parsed ?? null;

  const points: VolumePoint[] = [];
  for (const session of sessions) {
    const log = logs.find(
      (l) => l.session_id === session.id && l.exercise_id === exerciseId
    );
    if (!log || log.skipped) continue;
    points.push({ date: session.date, volume: totalVolume(log, parsed) });
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
