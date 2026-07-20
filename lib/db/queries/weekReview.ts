import { db, type Session, type ExerciseLog } from "@/lib/db/schema";
import { getExerciseInDay, plan } from "@/lib/plan/loader";
import { totalVolume } from "@/lib/domain/volume";
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
  /** dias distintos treinados */
  daysDone: number;
  /** dias de treino previstos no plano */
  planTotal: number;
  /** volume total da semana (reps + segundos somados — proxy de carga) */
  volume: number;
  /** variação % vs. a semana anterior (null se não dá pra comparar) */
  volumeDeltaPct: number | null;
  avgRpe: number | null;
  skippedCount: number;
}

/**
 * Resumo de uma semana. `monday` = segunda da semana a revisar; sem argumento,
 * revisa a semana anterior à corrente (uso do card da home). Generalizado para
 * permitir consulta de qualquer semana passada (5.2).
 */
export async function getWeekReview(monday?: string): Promise<WeekReview | null> {
  const reviewMonday = monday ?? shiftDays(weekStartKey(localDateKey()), -7);
  const prevMonday = shiftDays(reviewMonday, -7);

  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  );
  const inWeek = (s: Session, mon: string) => {
    const diff = daysBetween(mon, s.date);
    return diff >= 0 && diff <= 6;
  };

  const lastWeek = sessions.filter((s) => inWeek(s, reviewMonday));
  if (lastWeek.length === 0) return null;
  const prevWeek = sessions.filter((s) => inWeek(s, prevMonday));

  const logs = (await db.exerciseLogs.toArray()).filter((l) => !l.deleted_at);
  const logsBySession = new Map<string, ExerciseLog[]>();
  for (const l of logs) {
    const arr = logsBySession.get(l.session_id) ?? [];
    arr.push(l);
    logsBySession.set(l.session_id, arr);
  }

  // Volume da semana: soma dos volumes por log, com o parsed do dia da sessão
  const volumeOf = (weekSessions: Session[]) => {
    let sum = 0;
    for (const s of weekSessions) {
      for (const log of logsBySession.get(s.id) ?? []) {
        if (log.skipped) continue;
        const parsed =
          getExerciseInDay(s.weekday, log.exercise_id)?.parsed ?? null;
        sum += totalVolume(log, parsed);
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

  return {
    weekStart: reviewMonday,
    weekEnd: shiftDays(reviewMonday, 6),
    daysDone: new Set(lastWeek.map((s) => s.date)).size,
    planTotal: plan.days.length,
    volume,
    volumeDeltaPct,
    avgRpe,
    skippedCount,
  };
}

/** Segundas (mais recente → antiga) de semanas passadas com treino, para consulta. */
export async function getReviewableWeeks(): Promise<string[]> {
  const currentMonday = weekStartKey(localDateKey());
  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  );
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
  const reviews = await Promise.all(weeks.map((w) => getWeekReview(w)));
  return reviews.filter((r): r is WeekReview => r !== null);
}

// ── Textos do card ───────────────────────────────────────────────────

export interface WeekReviewTexts {
  good: string;
  improve: string | null;
  phrase: string;
}

// Frases por contexto dos dados — contextual evita o clichê genérico.
const PHRASES: Record<"full" | "up" | "partial", string[]> = {
  full: [
    "Semana cheia. Constância assim vale mais que qualquer treino perfeito.",
    "Todos os treinos no lugar — o corpo percebe antes do espelho.",
    "Plano cumprido de ponta a ponta. Agora é só não quebrar a corrente.",
  ],
  up: [
    "Mais volume que a semana passada, sem pular etapa. Progressão de verdade.",
    "Você está fazendo mais do que fazia. É exatamente assim que se avança.",
    "A curva está subindo. Mantém o padrão que o resto acompanha.",
  ],
  partial: [
    "Apareceu, treinou, registrou. Semana boa é a que existe.",
    "Menos que o planejado, muito mais que zero. Segunda recomeça o placar.",
    "Uma semana irregular não desfaz nada — desde que a próxima comece.",
  ],
};

/** Escolha determinística: a mesma semana mostra sempre a mesma frase. */
function pick(arr: string[], seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return arr[h % arr.length];
}

/** Constrói "o que foi bom", "a melhorar" e a frase a partir dos dados. */
export function buildWeekReviewTexts(r: WeekReview): WeekReviewTexts {
  const fullWeek = r.daysDone >= r.planTotal;
  const volumeUp = r.volumeDeltaPct !== null && r.volumeDeltaPct > 0;

  const good = fullWeek
    ? `Semana completa: ${r.daysDone}/${r.planTotal} treinos.`
    : volumeUp
      ? `Volume ${r.volumeDeltaPct}% acima da semana anterior.`
      : `${r.daysDone} ${r.daysDone === 1 ? "dia treinado" : "dias treinados"} — o histórico continua vivo.`;

  let improve: string | null = null;
  if (!fullWeek) {
    const missing = r.planTotal - r.daysDone;
    improve = `${missing} ${missing === 1 ? "treino ficou" : "treinos ficaram"} pelo caminho — vale olhar quais dias travaram.`;
  } else if (r.volumeDeltaPct !== null && r.volumeDeltaPct < 0) {
    improve = `Volume ${Math.abs(r.volumeDeltaPct)}% abaixo da semana anterior.`;
  } else if (r.skippedCount > 0) {
    improve = `${r.skippedCount} ${r.skippedCount === 1 ? "exercício pulado" : "exercícios pulados"} na semana.`;
  }

  const bucket = fullWeek ? "full" : volumeUp ? "up" : "partial";
  return { good, improve, phrase: pick(PHRASES[bucket], r.weekStart + bucket) };
}
