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

/** Índice id → exercício (primeira ocorrência), para nome/flags. */
const exerciseIndex: Map<string, PlanExercise> = (() => {
  const map = new Map<string, PlanExercise>();
  for (const day of plan.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        if (!map.has(ex.id)) map.set(ex.id, ex);
      }
    }
  }
  return map;
})();

export function getExerciseById(id: string): PlanExercise | undefined {
  return exerciseIndex.get(id);
}

/**
 * Exercício como definido num dia específico. Necessário porque o mesmo ID
 * pode ter alvo diferente entre dias (ex: frog-to-hs 5 rep na ter, 3 na sex).
 */
export function getExerciseInDay(
  weekday: number,
  id: string
): PlanExercise | undefined {
  const day = getDayByWeekday(weekday);
  if (!day) return undefined;
  for (const block of day.blocks) {
    for (const ex of block.exercises) {
      if (ex.id === id) return ex;
    }
  }
  return undefined;
}

/** IDs de exercício únicos no plano, com nome e união de flags entre dias. */
export function uniqueExercises(): {
  id: string;
  name: string;
  flags: string[];
}[] {
  const map = new Map<string, { id: string; name: string; flags: Set<string> }>();
  for (const day of plan.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        const entry =
          map.get(ex.id) ?? { id: ex.id, name: ex.name, flags: new Set<string>() };
        ex.flags.forEach((f) => entry.flags.add(f));
        map.set(ex.id, entry);
      }
    }
  }
  return [...map.values()].map((e) => ({
    id: e.id,
    name: e.name,
    flags: [...e.flags],
  }));
}

/** Flags negativas ("execução suja") de um movimento, unindo as definições entre dias. */
export function negFlagsOf(id: string): string[] {
  const set = new Set<string>();
  for (const day of plan.days) {
    for (const block of day.blocks) {
      for (const ex of block.exercises) {
        if (ex.id === id) ex.neg_flags?.forEach((f) => set.add(f));
      }
    }
  }
  return [...set];
}

/** plan_day_id estável = `${plan.id}:${weekday}`. Sobrevive a mudanças de versão. */
export function planDayId(weekday: number): string {
  return `${plan.id}:${weekday}`;
}
