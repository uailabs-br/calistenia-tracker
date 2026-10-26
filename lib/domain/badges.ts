export type BadgeFamily = "jornada" | "consistencia";

export interface Badge {
  id: string;
  family: BadgeFamily;
  title: string;
  description: string;
  earned: boolean;
  /** O número que o selo pede: treinos (jornada) ou semanas seguidas (consistência). */
  goal: number;
}

export interface BadgeStats {
  totalWorkouts: number;
  /** maior sequência de semanas batendo a meta (2.2) */
  longestStreak: number;
  /** sequência atual — é dela que sai o próximo selo de consistência. Sem ela, a maior. */
  currentStreak?: number;
}

function badge(
  id: string,
  family: BadgeFamily,
  title: string,
  description: string,
  goal: number,
  have: number
): Badge {
  return { id, family, title, description, earned: have >= goal, goal };
}

/**
 * Cataloga os selos e resolve "ganho/bloqueado" a partir de fatos do log.
 * Zero pontos/moeda: cada selo mapeia 1:1 a um fato verificável. Duas famílias:
 * jornada (nº de treinos) e consistência (streak de semanas). Dentro da família,
 * do mais fácil pro mais difícil.
 */
export function evaluateBadges(stats: BadgeStats): Badge[] {
  const w = stats.totalWorkouts;
  const s = stats.longestStreak;
  return [
    badge("primeiro-treino", "jornada", "Primeiro treino", "Você começou.", 1, w),
    badge("treinos-10", "jornada", "10 treinos", "Dez sessões no histórico.", 10, w),
    badge("treinos-50", "jornada", "50 treinos", "Cinquenta sessões — isso é hábito.", 50, w),
    badge("treinos-100", "jornada", "100 treinos", "Cem sessões. Raro.", 100, w),
    badge("constancia-4", "consistencia", "1 mês seguido", "4 semanas batendo a meta.", 4, s),
    badge("constancia-8", "consistencia", "2 meses seguidos", "8 semanas batendo a meta.", 8, s),
    badge("constancia-12", "consistencia", "3 meses seguidos", "12 semanas batendo a meta.", 12, s),
  ];
}

/** Ritmo de referência pra comparar as famílias: o mínimo de quem treina a sério. */
const WORKOUTS_PER_WEEK = 3;

/**
 * Semanas que o selo leva pra sair, no ritmo de referência. É o que compara "50
 * treinos" com "3 meses seguidos": contagem e sequência não têm medida comum, mas
 * as duas têm data provável. Daí: 10 treinos < 1 mês < 2 meses < 3 meses < 50 < 100.
 */
function weeksToEarn(b: Badge): number {
  return b.family === "jornada" ? b.goal / WORKOUTS_PER_WEEK : b.goal;
}

export interface BadgeHighlight {
  badge: Badge;
  /** O número grande do card e o que ele conta: 50 + "treinos", 2 + "meses seguidos". */
  value: number;
  unit: string;
  /** Quanto falta pro próximo da mesma família; null no último dela. */
  next: string | null;
}

function headline(b: Badge): { value: number; unit: string } {
  if (b.family === "jornada") return { value: b.goal, unit: b.goal === 1 ? "treino" : "treinos" };
  const months = b.goal / 4;
  return { value: months, unit: months === 1 ? "mês seguido" : "meses seguidos" };
}

function nextLine(next: Badge, stats: BadgeStats): string {
  if (next.family === "jornada") {
    const left = next.goal - stats.totalWorkouts;
    return `${left === 1 ? "falta 1" : `faltam ${left}`} pro de ${next.goal}`;
  }
  const left = next.goal - (stats.currentStreak ?? stats.longestStreak);
  const months = next.goal / 4;
  return `${left === 1 ? "falta 1 semana" : `faltam ${left} semanas`} pros ${months} meses`;
}

/**
 * O selo mais difícil já ganho, pro card da home. Empate de dificuldade fica com
 * a consistência: sequência é o que mais custa manter. Null sem nenhum ganho.
 */
export function highlightBadge(stats: BadgeStats): BadgeHighlight | null {
  const all = evaluateBadges(stats);
  const best = all
    .filter((b) => b.earned)
    .sort((a, b) => weeksToEarn(b) - weeksToEarn(a) || (a.family === "consistencia" ? -1 : 1))[0];
  if (!best) return null;
  const next = all.find((b) => b.family === best.family && !b.earned);
  return { badge: best, ...headline(best), next: next ? nextLine(next, stats) : null };
}
