/** Semanas cumpridas para ganhar +1 proteção (freeze). */
const WEEKS_PER_FREEZE = 4;
/** Teto de proteções acumuladas. */
const MAX_FREEZES = 2;

/**
 * Streak semanal com freeze determinístico (sem estado no banco).
 * `weeksMet` = semanas em ordem cronológica (mais antiga → mais nova), `true`
 * quando a meta foi batida. A semana corrente só entra se já batida (pendente
 * nunca quebra). Regras:
 * - a cada WEEKS_PER_FREEZE semanas batidas ganha +1 proteção (teto MAX_FREEZES);
 * - semana falha com proteção consome a proteção e preserva a streak;
 * - semana falha sem proteção zera a streak.
 */
export function streakWithFreeze(weeksMet: boolean[]): number {
  let streak = 0;
  let protections = 0;
  let sinceFreeze = 0;

  for (const met of weeksMet) {
    if (met) {
      streak++;
      if (++sinceFreeze >= WEEKS_PER_FREEZE) {
        protections = Math.min(MAX_FREEZES, protections + 1);
        sinceFreeze = 0;
      }
    } else if (protections > 0) {
      protections--; // consome, preserva a streak (não incrementa)
    } else {
      streak = 0;
      protections = 0;
      sinceFreeze = 0;
    }
  }
  return streak;
}
