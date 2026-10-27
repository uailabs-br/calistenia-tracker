import type { Workout } from "@/lib/plan/schema";
import { getCatalogExercise } from "@/lib/plan/catalog";
import {
  exerciseSkillMapping,
  getSkillById,
  skillIdForWorkout,
  type SkillCategory,
} from "@/lib/plan/skills";
import type { FocusEntry } from "@/lib/domain/workoutFocus";

/**
 * Categoria de um exercício do treino. O catálogo resolve quase tudo; o que a
 * IA inventou fora dele cai nas pistas do próprio plano: o nível de escada que
 * o exercício declara e, por último, a skill do treino.
 */
function categoryOf(exerciseId: string, workout: Workout): SkillCategory | null {
  const fromCatalog = getCatalogExercise(exerciseId)?.category;
  if (fromCatalog) return fromCatalog;
  const mapped = exerciseSkillMapping(exerciseId);
  if (mapped) return getSkillById(mapped.skill_id)?.category ?? null;
  const daySkill = skillIdForWorkout(workout.skill);
  return daySkill ? (getSkillById(daySkill)?.category ?? null) : null;
}

/** Entrada do `workoutFocus`: cada exercício com a categoria e as séries do plano. */
export function focusEntries(workout: Workout): FocusEntry[] {
  return workout.blocks.flatMap((b) =>
    b.exercises.map((ex) => ({
      category: categoryOf(ex.id, workout),
      sets: ex.parsed?.sets ?? 1,
    }))
  );
}
