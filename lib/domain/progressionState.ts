/**
 * Máquina de estados da progressão, pura. Existe num lugar só porque três telas
 * leem o mesmo veredito (aviso no fim da sessão, mapa de progressão, aviso de
 * trocar de treino na home): se cada uma reimplementar os limites, elas passam a
 * discordar e a pessoa não tem como saber qual está certa.
 */

export type SkillState = "ready" | "regress" | "stale" | "tracking";

/** "falha em 3 sessões consecutivas sugere regressão" (progressions.json: advancement_logic). */
export const REGRESS_STREAK = 3;
/** Teto de sessões sem decisão, pra não ficar preso pra sempre em "tracking". */
export const STALE_SESSIONS = 8;
/** Nº de sessões consecutivas no alvo (e limpas) do motor genérico, sem critério próprio. */
export const READY_STREAK = 2;

/** Um registro que vota a favor ou contra a subida, do mais recente pro mais antigo. */
export interface Vote {
  /** cumpriu o critério (motor estruturado) ou bateu o alvo limpo (genérico) */
  met: boolean;
  /**
   * Falha "de verdade": não cumpriu o que o PLANO pediu, ou executou sujo. Ficar
   * abaixo do critério da escada dentro do plano é só "ainda não é hora".
   */
  realFailure: boolean;
}

/** Quantos votos positivos seguidos, do mais recente pra trás. */
export function positiveStreak(votes: Vote[]): number {
  let n = 0;
  for (const v of votes) {
    if (!v.met) break;
    n++;
  }
  return n;
}

/** `votes` do mais recente pro mais antigo; `required` = sessões que o nível exige. */
export function skillStateFromVotes(votes: Vote[], required: number): SkillState {
  if (votes.length === 0) return "tracking";
  if (positiveStreak(votes) >= required) return "ready";

  let negative = 0;
  for (const v of votes) {
    if (v.met || !v.realFailure) break;
    negative++;
  }
  if (negative >= REGRESS_STREAK) return "regress";

  if (votes.length >= STALE_SESSIONS) return "stale";
  return "tracking";
}
