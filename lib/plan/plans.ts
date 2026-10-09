import type { Plan } from "./schema";
import { seeds } from "./seeds";
import pessoal from "./plans/pessoal-mu-hs-fl.json";

/**
 * Planos que o repo conhece, por id. É o que permite recuperar o plano certo a
 * partir do histórico (`plan_day_id` = `${plan.id}:${workout_id}`) quando o
 * override do localStorage some. Plano importado de fora do repo não entra aqui.
 */
const KNOWN: Plan[] = [...seeds.map((s) => s.plan), pessoal as unknown as Plan];

export function getKnownPlan(id: string): Plan | undefined {
  return KNOWN.find((p) => p.id === id);
}

export function knownPlanIds(): string[] {
  return KNOWN.map((p) => p.id);
}
