import { daysBetween, weekStartKey } from "@/lib/utils/date";

/**
 * A partir de quantos dias sem treinar a home reconhece a pausa. Uma semana
 * inteira: com a constância medida por semana, é quando a falta já custou uma.
 */
export const RETURN_AFTER_DAYS = 7;

export interface ReturnNudge {
  /** Dias desde o último treino concluído. */
  days: number;
  /** A segunda linha do card: o que ainda dá pra fazer nesta semana. */
  line: string;
}

/**
 * Card de volta depois de uma pausa. A ideia vem do megaestudo de academias
 * (Milkman et al., Nature 2021): o que mais aumentou a frequência foi não deixar
 * uma falta virar duas. Por isso o texto não cobra a pausa e mostra uma meta
 * que ainda cabe na semana, nunca a meta cheia quando ela já não cabe.
 *
 * `null` quando não há pausa (ou nunca houve treino: aí é estreante, não volta).
 */
export function returnNudge(input: {
  lastWorkoutDate: string | null;
  today: string;
  weekGoal: number;
}): ReturnNudge | null {
  const { lastWorkoutDate, today, weekGoal } = input;
  if (!lastWorkoutDate) return null;
  const days = daysBetween(lastWorkoutDate, today);
  if (days < RETURN_AFTER_DAYS) return null;

  // Hoje conta: na segunda cabem 7 dias, no domingo, 1.
  const daysLeft = 7 - daysBetween(weekStartKey(today), today);
  const line =
    daysLeft >= weekGoal
      ? "Voltar hoje já conta, e ainda dá pra bater a meta da semana."
      : `Voltar hoje já conta. Até domingo ainda ${daysLeft === 1 ? "cabe 1 treino" : `cabem ${daysLeft} treinos`}.`;
  return { days, line };
}

/**
 * Voltas no histórico: pausas de RETURN_AFTER_DAYS ou mais entre dois dias de
 * treino seguidos. É o que o selo "De volta" conta. `dates` em qualquer ordem,
 * com repetição (vários treinos no mesmo dia).
 */
export function countReturns(dates: readonly string[]): number {
  const days = [...new Set(dates)].sort();
  let n = 0;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) >= RETURN_AFTER_DAYS) n++;
  }
  return n;
}

/**
 * O treino de `date` encerrou uma pausa? Devolve a pausa em dias e qual volta é
 * (1 = a primeira). Um segundo treino no mesmo dia da volta não conta de novo.
 */
export function returnAt(
  dates: readonly string[],
  date: string
): { days: number; nth: number } | null {
  const days = [...new Set(dates)].sort();
  const i = days.indexOf(date);
  if (i <= 0) return null;
  const gap = daysBetween(days[i - 1], date);
  if (gap < RETURN_AFTER_DAYS) return null;
  return { days: gap, nth: countReturns(days.slice(0, i + 1)) };
}
