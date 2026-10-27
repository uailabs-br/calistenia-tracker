import { db, type Session } from "@/lib/db/schema";
import { getCompletedSessions, getLiveLogs, groupBySession } from "./sessions";
import { recordsBetween, replayRecords, type LatestRecord } from "./pr";
import { sessionsRequiredFor, skillLogsFrom, skillVotes } from "./skillProgression";
import { plan } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { getLevelInfo, getSkillById } from "@/lib/plan/skills";
import { totalVolume } from "@/lib/domain/volume";
import { closingIndexes } from "@/lib/domain/campaign";
import { getWeekGoal } from "@/lib/utils/profile";
import {
  daysBetween,
  localDateKey,
  shiftDays,
  weekStartKey,
} from "@/lib/utils/date";

/**
 * Resumo da última semana (Seg–Dom anterior à corrente), para o card de
 * feedback semanal da home. null se a última semana não teve treino.
 */
export interface WeekReview {
  /** segunda da semana revisada (dateKey) */
  weekStart: string;
  /** domingo da semana revisada (dateKey) */
  weekEnd: string;
  /** treinos concluídos (plano + avulso) */
  sessionsDone: number;
  /** nº de treinos do plano */
  planTotal: number;
  /** volume total da semana (reps + segundos somados — proxy de carga) */
  volume: number;
  /** variação % vs. a semana anterior (null se não dá pra comparar) */
  volumeDeltaPct: number | null;
  avgRpe: number | null;
  skippedCount: number;
  /** Meta semanal: a mesma da constância (a do perfil, ou o nº de treinos do plano). */
  goal: number;
  /** Seg→Dom: rótulo do treino do dia ("A", "+" pra avulso) ou null sem treino. */
  days: (string | null)[];
  /** Recordes batidos na semana, um por exercício. */
  records: LatestRecord[];
  /** Níveis de skill que fecharam na semana. */
  levelsClosed: { skillId: string; skillName: string; level: number; levelName: string }[];
  /** Exercícios pulados na semana, com quantas vezes. */
  skipped: { name: string; count: number }[];
}

/**
 * Resumo de uma semana. `monday` = segunda da semana a revisar; sem argumento,
 * revisa a semana anterior à corrente (uso do card da home). Generalizado para
 * permitir consulta de qualquer semana passada (5.2).
 */
/** Recordes e fechamentos de nível do histórico inteiro, refeitos uma vez. */
interface ReplayContext {
  records: LatestRecord[];
  closings: LevelClosing[];
}

export async function getWeekReview(
  monday?: string,
  ctx?: ReplayContext
): Promise<WeekReview | null> {
  const reviewMonday = monday ?? shiftDays(weekStartKey(localDateKey()), -7);
  const prevMonday = shiftDays(reviewMonday, -7);

  const sessions = await getCompletedSessions();
  const inWeek = (s: Session, mon: string) => {
    const diff = daysBetween(mon, s.date);
    return diff >= 0 && diff <= 6;
  };

  const lastWeek = sessions.filter((s) => inWeek(s, reviewMonday));
  if (lastWeek.length === 0) return null;
  const prevWeek = sessions.filter((s) => inWeek(s, prevMonday));

  const logsBySession = groupBySession(await getLiveLogs());

  // Volume da semana: soma dos volumes por log, com o parsed do dia da sessão
  const volumeOf = (weekSessions: Session[]) => {
    let sum = 0;
    for (const s of weekSessions) {
      for (const log of logsBySession.get(s.id) ?? []) {
        if (log.skipped) continue;
        const ex = resolveLogExercise(log, s.workout_id);
        sum += totalVolume(log, ex.parsed, ex.target);
      }
    }
    return sum;
  };

  const volume = volumeOf(lastWeek);
  const prevVolume = volumeOf(prevWeek);
  const volumeDeltaPct =
    prevVolume > 0
      ? Math.round(((volume - prevVolume) / prevVolume) * 100)
      : null;

  const rpes = lastWeek
    .filter((s) => s.rpe != null)
    .map((s) => s.rpe as number);
  const avgRpe =
    rpes.length > 0
      ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10
      : null;

  const skippedCount = lastWeek.reduce(
    (acc, s) =>
      acc + (logsBySession.get(s.id) ?? []).filter((l) => l.skipped).length,
    0
  );

  const weekEnd = shiftDays(reviewMonday, 6);
  const replay = ctx ?? (await replayContext());

  // Seg→Dom; dia com dois treinos mostra o primeiro.
  const days: (string | null)[] = Array.from({ length: 7 }, (_, i) => {
    const s = lastWeek.find((x) => x.date === shiftDays(reviewMonday, i));
    if (!s) return null;
    if (s.source === "freeform") return "+";
    return plan.workouts.find((w) => w.id === s.workout_id)?.label ?? "•";
  });

  const skippedMap = new Map<string, number>();
  for (const s of lastWeek) {
    for (const log of logsBySession.get(s.id) ?? []) {
      if (!log.skipped) continue;
      const name = resolveLogExercise(log, s.workout_id).name ?? log.exercise_id;
      skippedMap.set(name, (skippedMap.get(name) ?? 0) + 1);
    }
  }

  return {
    weekStart: reviewMonday,
    weekEnd,
    sessionsDone: lastWeek.length,
    planTotal: plan.workouts.length,
    volume,
    volumeDeltaPct,
    avgRpe,
    skippedCount,
    goal: getWeekGoal() ?? plan.workouts.length,
    days,
    records: recordsBetween(replay.records, reviewMonday, weekEnd),
    levelsClosed: levelsClosedBetween(replay.closings, reviewMonday, weekEnd),
    skipped: [...skippedMap].map(([name, count]) => ({ name, count })),
  };
}

type LevelClosing = WeekReview["levelsClosed"][number] & { date: string };

async function replayContext(): Promise<ReplayContext> {
  return { records: await replayRecords(), closings: await levelClosings() };
}

/**
 * Cada vez que um nível fechou no histórico: a sessão em que a sequência no
 * critério chegou ao exigido. Mesmos filtros e votos do aviso de progressão,
 * então o resumo não discorda do que apareceu no fim do treino.
 */
async function levelClosings(): Promise<LevelClosing[]> {
  const logs = (await getLiveLogs()).filter((l) => l.skill_id && l.level_at_time !== null);
  const sessions = new Map((await db.sessions.toArray()).map((s) => [s.id, s]));
  const pairs = new Set(logs.map((l) => `${l.skill_id}|${l.level_at_time}`));

  const out: LevelClosing[] = [];
  for (const pair of pairs) {
    const [skillId, levelText] = pair.split("|");
    const level = Number(levelText);
    const entries = skillLogsFrom(logs, sessions, skillId, { level }).filter(
      (e) => e.log.criterion_met !== null
    );
    // skillVotes devolve um voto por entrada com critério, na mesma ordem
    const votes = skillVotes(entries).reverse();
    const chrono = [...entries].reverse();
    for (const i of closingIndexes(votes, sessionsRequiredFor(skillId, level))) {
      out.push({
        skillId,
        skillName: getSkillById(skillId)?.name ?? skillId,
        level,
        levelName: getLevelInfo(skillId, level)?.name ?? `nível ${level}`,
        date: chrono[i].session.date,
      });
    }
  }
  return out;
}

/** Níveis que fecharam no período, um por nível. */
function levelsClosedBetween(
  closings: LevelClosing[],
  from: string,
  to: string
): WeekReview["levelsClosed"] {
  const seen = new Set<string>();
  const out: WeekReview["levelsClosed"] = [];
  for (const c of closings) {
    if (c.date < from || c.date > to) continue;
    const key = `${c.skillId}|${c.level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ skillId: c.skillId, skillName: c.skillName, level: c.level, levelName: c.levelName });
  }
  return out;
}

/** Segundas (mais recente → antiga) de semanas passadas com treino, para consulta. */
export async function getReviewableWeeks(): Promise<string[]> {
  const currentMonday = weekStartKey(localDateKey());
  const sessions = await getCompletedSessions();
  const weeks = new Set<string>();
  for (const s of sessions) {
    const wk = weekStartKey(s.date);
    if (daysBetween(wk, currentMonday) > 0) weeks.add(wk); // só semanas passadas
  }
  return [...weeks].sort().reverse();
}

/** Resumos de todas as semanas passadas consultáveis (recente → antiga). */
export async function getWeekHistory(): Promise<WeekReview[]> {
  const weeks = await getReviewableWeeks();
  const ctx = await replayContext();
  const reviews = await Promise.all(weeks.map((w) => getWeekReview(w, ctx)));
  return reviews.filter((r): r is WeekReview => r !== null);
}
