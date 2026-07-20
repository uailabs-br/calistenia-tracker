export type BadgeFamily = "jornada" | "consistencia" | "tecnica";

export interface Badge {
  id: string;
  family: BadgeFamily;
  title: string;
  description: string;
  earned: boolean;
}

/** Sessões limpas seguidas de um movimento para o selo de técnica. */
export const CLEAN_STREAK_TARGET = 3;

export interface BadgeStats {
  totalWorkouts: number;
  /** maior sequência de semanas batendo a meta (2.2) */
  longestStreak: number;
  /** por movimento com neg_flags: tamanho da sequência atual de sessões limpas */
  cleanStreaks: { id: string; name: string; streak: number }[];
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
 * Zero pontos/moeda: cada selo mapeia 1:1 a um fato verificável.
 */
export function evaluateBadges(stats: BadgeStats): Badge[] {
  const badges: Badge[] = [
    badge("primeiro-treino", "jornada", "Primeiro treino", "Você começou.", stats.totalWorkouts >= 1),
    badge("treinos-10", "jornada", "10 treinos", "Dez sessões no histórico.", stats.totalWorkouts >= 10),
    badge("treinos-50", "jornada", "50 treinos", "Cinquenta sessões — isso é hábito.", stats.totalWorkouts >= 50),
    badge("treinos-100", "jornada", "100 treinos", "Cem sessões. Raro.", stats.totalWorkouts >= 100),
    badge("constancia-4", "consistencia", "1 mês seguido", "4 semanas batendo a meta.", stats.longestStreak >= 4),
    badge("constancia-8", "consistencia", "2 meses seguidos", "8 semanas batendo a meta.", stats.longestStreak >= 8),
    badge("constancia-12", "consistencia", "3 meses seguidos", "12 semanas batendo a meta.", stats.longestStreak >= 12),
  ];

  for (const m of stats.cleanStreaks) {
    badges.push(
      badge(
        `tecnica-${m.id}`,
        "tecnica",
        `Técnica limpa: ${m.name}`,
        `${CLEAN_STREAK_TARGET} sessões seguidas sem falha de técnica.`,
        m.streak >= CLEAN_STREAK_TARGET
      )
    );
  }
  return badges;
}
