import planData from "./plan.json";
import { planSchema, type Plan, type Workout, type PlanExercise } from "./schema";
import { convertLegacyPlan, isLegacyPlan } from "./legacyPlan";

/** Chave do override de plano importado via app (ver lib/plan/importPlan.ts). */
export const PLAN_OVERRIDE_KEY = "calistenia:plan-override";

/**
 * Por padrão o plano é bundlado (não vai pro banco) e validado em build
 * (scripts/validate-plan.mjs). Se houver um treino importado pelo app no
 * localStorage deste aparelho, ele tem prioridade — revalidado aqui porque
 * veio de fora do build. Formato antigo (agenda por weekday) é convertido.
 */
function loadPlan(): Plan {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(PLAN_OVERRIDE_KEY);
      if (raw) {
        const json: unknown = JSON.parse(raw);
        const candidate = isLegacyPlan(json) ? convertLegacyPlan(json) : json;
        const result = planSchema.safeParse(candidate);
        if (result.success) return result.data;
      }
    } catch {
      /* override corrompido — cai pro plano padrão */
    }
  }
  return planData as unknown as Plan;
}

export const plan = loadPlan();

export function getWorkoutById(id: string): Workout | undefined {
  return plan.workouts.find((w) => w.id === id);
}

/** Índice id → exercício (primeira ocorrência), para nome/flags. */
const exerciseIndex: Map<string, PlanExercise> = (() => {
  const map = new Map<string, PlanExercise>();
  for (const workout of plan.workouts) {
    for (const block of workout.blocks) {
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
 * Exercício como definido num treino específico. Necessário porque o mesmo ID
 * pode ter alvo diferente entre treinos (ex: frog-to-hs 5 rep no B, 3 no E).
 * `workoutId` null (treino avulso) não tem definição própria.
 */
export function getExerciseInWorkout(
  workoutId: string | null,
  id: string
): PlanExercise | undefined {
  const workout = workoutId ? getWorkoutById(workoutId) : undefined;
  if (!workout) return undefined;
  for (const block of workout.blocks) {
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
  for (const workout of plan.workouts) {
    for (const block of workout.blocks) {
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
  for (const workout of plan.workouts) {
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        if (ex.id === id) ex.neg_flags?.forEach((f) => set.add(f));
      }
    }
  }
  return [...set];
}

/** plan_day_id estável = `${plan.id}:${workoutId}`. Sobrevive a mudanças de versão. */
export function planDayId(workoutId: string): string {
  return `${plan.id}:${workoutId}`;
}
