export type BadgeFamily = "jornada" | "consistencia";

export interface Badge {
  id: string;
  family: BadgeFamily;
  title: string;
  description: string;
  earned: boolean;
}

export interface BadgeStats {
  totalWorkouts: number;
  /** maior sequência de semanas batendo a meta (2.2) */
  longestStreak: number;
}

function badge(
  id: string,
  family: BadgeFamily,
  title: string,
  description: string,
  earned: boolean
): Badge {
  return { id, family, title, description, earned };
}

/**
 * Cataloga os selos e resolve "ganho/bloqueado" a partir de fatos do log.
 * Zero pontos/moeda: cada selo mapeia 1:1 a um fato verificável. Duas famílias:
 * jornada (nº de treinos) e consistência (streak de semanas).
 */
export function evaluateBadges(stats: BadgeStats): Badge[] {
  return [
    badge("primeiro-treino", "jornada", "Primeiro treino", "Você começou.", stats.totalWorkouts >= 1),
    badge("treinos-10", "jornada", "10 treinos", "Dez sessões no histórico.", stats.totalWorkouts >= 10),
    badge("treinos-50", "jornada", "50 treinos", "Cinquenta sessões — isso é hábito.", stats.totalWorkouts >= 50),
    badge("treinos-100", "jornada", "100 treinos", "Cem sessões. Raro.", stats.totalWorkouts >= 100),
    badge("constancia-4", "consistencia", "1 mês seguido", "4 semanas batendo a meta.", stats.longestStreak >= 4),
    badge("constancia-8", "consistencia", "2 meses seguidos", "8 semanas batendo a meta.", stats.longestStreak >= 8),
    badge("constancia-12", "consistencia", "3 meses seguidos", "12 semanas batendo a meta.", stats.longestStreak >= 12),
  ];
}
