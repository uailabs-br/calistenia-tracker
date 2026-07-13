import planData from "./plan.json";
import type { Plan, PlanDay, PlanExercise } from "./schema";

/**
 * O plano é bundlado (não vai pro banco). A validação Zod roda em build
 * (scripts/validate-plan.mjs), então aqui confiamos no tipo.
 */
export const plan = planData as unknown as Plan;

export function getDayByWeekday(weekday: number): PlanDay | undefined {
  return plan.days.find((d) => d.weekday === weekday);
}

/** Índice id → exercício, para lookups de última performance e métricas. */
const exerciseIndex: Map<string, PlanExercise> = (() => {
  const map = new Map<string, PlanExercise>();
  for (const day of plan.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        map.set(ex.id, ex);
      }
    }
  }
  return map;
})();

export function getExerciseById(id: string): PlanExercise | undefined {
  return exerciseIndex.get(id);
}

/** plan_day_id estável = `${plan.id}:${weekday}`. Sobrevive a mudanças de versão. */
export function planDayId(weekday: number): string {
  return `${plan.id}:${weekday}`;
}
