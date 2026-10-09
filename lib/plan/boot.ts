import { db } from "@/lib/db/schema";
import { getKnownPlan } from "@/lib/plan/plans";
import { planIdFromPlanDayId, shouldRunOnboarding } from "@/lib/domain/onboarding";
import type { Plan } from "@/lib/plan/schema";

export type PlanBootDecision =
  | { action: "none" }
  /** Aplicar este plano (grava o override) e recarregar. */
  | { action: "apply"; plan: Plan }
  /** O histórico aponta pra um plano que o repo não conhece (importado de fora e perdido). */
  | { action: "lost"; planId: string }
  | { action: "onboarding" };

/**
 * O que fazer no boot. O plano em memória (`loadPlan`) é síncrono e de nível de
 * módulo, e ler o Dexie é assíncrono, então a recuperação é um passo separado.
 *
 * O histórico sabe qual plano era: `plan_day_id` é `${plan.id}:${workout_id}`.
 * Sem override, a última sessão concluída diz qual plano reaplicar.
 *
 * Com override a decisão é SEMPRE `none`: é isso que impede o loop, já que
 * aplicar um plano grava o override e o boot seguinte nem chega a consultar.
 */
export async function decidePlanBoot(input: {
  currentPlanId: string;
  hasOverride: boolean;
  onboardingDone: boolean;
  /** A pessoa voltou ao plano padrão de propósito: não recuperar pelo histórico. */
  recoveryOptOut?: boolean;
}): Promise<PlanBootDecision> {
  if (input.hasOverride) return { action: "none" };

  const live = (await db.sessions.toArray()).filter((s) => !s.deleted_at);
  const last = live
    .filter((s) => s.status === "completed" && s.plan_day_id)
    .sort((a, b) => b.started_at - a.started_at)[0];

  if (last) {
    if (input.recoveryOptOut) return { action: "none" };
    const planId = planIdFromPlanDayId(last.plan_day_id);
    if (!planId || planId === input.currentPlanId) return { action: "none" };
    const known = getKnownPlan(planId);
    // Sessão de uma versão MAIS NOVA que a cópia do repo: o plano foi editado por
    // fora (a IA preserva o id da raiz) e o override era a única cópia. Reaplicar
    // a cópia velha apagaria a edição, então trata como perdido. Versão igual ou
    // mais antiga é o caso normal — a cópia do repo é o sucessor legítimo.
    if (known && last.plan_version > known.version) return { action: "lost", planId };
    return known ? { action: "apply", plan: known } : { action: "lost", planId };
  }

  const run = shouldRunOnboarding({
    hasSessions: live.length > 0,
    hasPlanOverride: false,
    onboardingDone: input.onboardingDone,
  });
  return run ? { action: "onboarding" } : { action: "none" };
}
