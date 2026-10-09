/**
 * Onboarding: respostas leigas de capacidade → posição nas escadas de skill e
 * escolha do plano-semente. Puro: sem React, sem Dexie, sem localStorage.
 */

export type SeedId = "iniciante-sem-barra" | "iniciante-com-barra" | "intermediario";

export type Equipment = "chao" | "casa_barra" | "praca" | "academia";

export interface OnboardingAnswers {
  equipment: Equipment;
  push_up: "0" | "1-5" | "6-15" | "16+";
  /** Só perguntado quando há barra. */
  pull_up?: "nunca" | "ainda_nao" | "1-2" | "3-7" | "8+";
  handstand_hold: "nunca" | "segundos" | "30s" | "solto";
  /** Só perguntado quando há paralelas. */
  dips?: "nunca" | "pes_chao" | "completo" | "8+";
  days_per_week: number;
}

export type QuestionKey = "push_up" | "pull_up" | "handstand_hold" | "dips";

const HAS_BAR: Equipment[] = ["casa_barra", "praca", "academia"];
const HAS_PARALLELS: Equipment[] = ["praca", "academia"];

export function hasBar(e: Equipment): boolean {
  return HAS_BAR.includes(e);
}

export function hasParallels(e: Equipment): boolean {
  return HAS_PARALLELS.includes(e);
}

/**
 * O que cada setup oferece. Uma semente serve se tudo que ela pede está aqui:
 * quem treina na praça também consegue fazer a semente que só usa o chão (ela
 * pede MENOS, não outra coisa).
 */
const TAGS: Record<Equipment, string[]> = {
  chao: ["chão", "parede"],
  casa_barra: ["chão", "parede", "barra"],
  praca: ["chão", "parede", "barra", "paralelas"],
  academia: ["chão", "parede", "barra", "paralelas"],
};

export function availableTags(e: Equipment): string[] {
  return TAGS[e];
}

export function seedFits(seedTags: readonly string[], e: Equipment): boolean {
  const have = new Set(TAGS[e]);
  return seedTags.every((t) => have.has(t));
}

/** Perguntas de capacidade que fazem sentido para o equipamento, na ordem da tela. */
export function questionsFor(equipment: Equipment): QuestionKey[] {
  const keys: QuestionKey[] = ["push_up"];
  if (hasBar(equipment)) keys.push("pull_up");
  keys.push("handstand_hold");
  if (hasParallels(equipment)) keys.push("dips");
  return keys;
}

/**
 * Resposta → índice (0-based) da etapa EM FOCO na escada, o mesmo que a página
 * da skill grava em `setSkillLevel`. Vale `índice = etapas que a pessoa já bate`.
 *
 * Regra de design: na dúvida, a MENOR etapa. A posição exibida é
 * `max(logs, manual)`, então um palpite alto não é corrigido por nenhum treino
 * depois; um baixo se corrige no primeiro log limpo.
 */
const LEVEL_INDEX = {
  push_up: { "0": 0, "1-5": 1, "6-15": 2, "16+": 3 },
  pull_up: { nunca: 0, ainda_nao: 1, "1-2": 3, "3-7": 4, "8+": 5 },
  handstand_hold: { nunca: 0, segundos: 2, "30s": 3, solto: 5 },
  dips: { nunca: 0, pes_chao: 1, completo: 2, "8+": 3 },
} as const;

/** { skillId: índice em foco } só das skills que foram perguntadas. */
export function mapAnswersToSkillLevels(a: OnboardingAnswers): Record<string, number> {
  const out: Record<string, number> = {
    push_up: LEVEL_INDEX.push_up[a.push_up],
    handstand_hold: LEVEL_INDEX.handstand_hold[a.handstand_hold],
  };
  if (hasBar(a.equipment) && a.pull_up) out.pull_up = LEVEL_INDEX.pull_up[a.pull_up];
  if (hasParallels(a.equipment) && a.dips) out.dips = LEVEL_INDEX.dips[a.dips];
  return out;
}

/**
 * Semente sugerida (o usuário pode trocar). `intermediario` exige paralelas, que
 * é o equipamento da semente; quem tem só barra em casa fica na de iniciante,
 * que erra pra baixo.
 */
export function suggestSeed(a: OnboardingAnswers): SeedId {
  if (!hasBar(a.equipment)) return "iniciante-sem-barra";
  const pushOk = a.push_up === "6-15" || a.push_up === "16+";
  const pullOk = a.pull_up === "1-2" || a.pull_up === "3-7" || a.pull_up === "8+";
  if (pushOk && pullOk && hasParallels(a.equipment)) return "intermediario";
  return "iniciante-com-barra";
}

/** O onboarding só roda para quem ainda não tem nenhum rastro de uso. */
export function shouldRunOnboarding(s: {
  hasSessions: boolean;
  hasPlanOverride: boolean;
  onboardingDone: boolean;
}): boolean {
  return !s.hasSessions && !s.hasPlanOverride && !s.onboardingDone;
}

/**
 * `plan_day_id` é `${plan.id}:${workout_id}`. O id do plano é tudo antes do
 * ÚLTIMO ":" (o mesmo critério da migração Dexie v5).
 */
export function planIdFromPlanDayId(planDayId: string | null | undefined): string | null {
  if (!planDayId) return null;
  const i = planDayId.lastIndexOf(":");
  return i > 0 ? planDayId.slice(0, i) : null;
}
