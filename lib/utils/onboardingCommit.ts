import {
  mapAnswersToSkillLevels,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import type { Plan } from "@/lib/plan/schema";
import { applyPlan } from "@/lib/plan/importPlan";
import { saveOnboarding } from "@/lib/utils/onboarding";
import { clearSkillLevel, setSkillLevel } from "@/lib/utils/skillLevel";
import { setProfileName, setWeekGoal } from "@/lib/utils/profile";

/** Skills que o onboarding pergunta (em algum equipamento). */
const CAPACITY_SKILLS = ["push_up", "pull_up", "handstand_hold", "dips"] as const;

/**
 * Grava o resultado do onboarding, na primeira vez e ao refazer.
 *
 * A ordem importa: quem chama termina com navegação completa, que mata o estado
 * do React e recarrega o módulo `plan`. Por isso o plano é a ÚLTIMA escrita.
 *
 * Resposta que mapeia pra posição 0 LIMPA o ajuste manual da skill em vez de
 * gravar 0. Gravar 0 marcaria "ajuste manual" na página da skill à toa; e ao
 * refazer, quem agora diz "nunca tentei" precisa perder o ajuste que o
 * onboarding anterior deixou, senão `max(logs, manual)` o manteria alto. Os
 * logs continuam valendo: só a parte declarada é refeita.
 *
 * `plan = null` mantém o plano em uso (refazer sem trocar de plano).
 */
export function commitOnboarding(input: {
  answers: OnboardingAnswers;
  name: string;
  plan: Plan | null;
}): void {
  const { answers, name, plan } = input;
  setProfileName(name);
  const levels = mapAnswersToSkillLevels(answers);
  // Toda skill que ESTE onboarding poderia ter respondido entra na conta, mesmo
  // sem resposta agora: quem trocou a praça por "só o chão" deixa de responder
  // barra e dips, e o ajuste antigo precisa sair junto.
  for (const skillId of CAPACITY_SKILLS) {
    const level = levels[skillId];
    if (level && level > 0) setSkillLevel(skillId, level);
    else clearSkillLevel(skillId);
  }
  setWeekGoal(answers.days_per_week);
  saveOnboarding(answers);
  if (plan) applyPlan(plan);
}
