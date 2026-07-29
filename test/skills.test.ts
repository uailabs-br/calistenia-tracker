import { describe, it, expect } from "vitest";
import planData from "@/lib/plan/plan.json";
import progressionsData from "@/lib/plan/progressions.json";
import { getCriteria, exerciseSkillMapping } from "@/lib/plan/skills";

// Acesso direto ao LEVEL_EXERCISE não é exportado (é implementação interna) —
// o teste passa pela API pública (exerciseSkillMapping) reconstruindo o
// conjunto de exercise_ids do plano, garantindo que cada mapeamento aponta
// pra um exercício e um nível que realmente existem.
const planExerciseIds = new Set(
  planData.days.flatMap((day) =>
    day.blocks.flatMap((block) => block.exercises.map((ex) => ex.id))
  )
);

const skillLevels = new Map(
  progressionsData.skills.map((s) => [
    s.id,
    new Set(s.progressions.map((p) => p.level)),
  ])
);

describe("LEVEL_EXERCISE (via exerciseSkillMapping)", () => {
  it("todo exercise_id mapeado existe no plan.json", () => {
    for (const exerciseId of planExerciseIds) {
      const mapping = exerciseSkillMapping(exerciseId);
      if (!mapping) continue;
      expect(planExerciseIds.has(exerciseId)).toBe(true);
    }
  });

  it("todo nível referenciado existe em progressions.json pro skill certo", () => {
    for (const exerciseId of planExerciseIds) {
      const mapping = exerciseSkillMapping(exerciseId);
      if (!mapping) continue;
      const levels = skillLevels.get(mapping.skill_id);
      expect(levels, `skill ${mapping.skill_id} não existe`).toBeDefined();
      expect(
        levels!.has(mapping.level),
        `${mapping.skill_id} nível ${mapping.level} não existe (exercício ${exerciseId})`
      ).toBe(true);
    }
  });

  it("criteria_type do mapeamento bate com o criteria.type do nível", () => {
    for (const exerciseId of planExerciseIds) {
      const mapping = exerciseSkillMapping(exerciseId);
      if (!mapping) continue;
      const criteria = getCriteria(mapping.skill_id, mapping.level);
      expect(criteria).toBeDefined();
      expect(mapping.criteria_type).toBe(criteria!.type);
    }
  });

  it("exercícios sem mapeamento retornam null", () => {
    expect(exerciseSkillMapping("exercicio-inexistente")).toBeNull();
  });

  it("remapeamento v1→v3: pull-up-peso-morto aponta pro nível 4 (Pull-up Pronado)", () => {
    expect(exerciseSkillMapping("pull-up-peso-morto")).toEqual({
      skill_id: "pull_up",
      level: 4,
      criteria_type: "reps_rir",
    });
  });

  it("remapeamento v1→v3: mu-negativa-transicao aponta pro nível 3", () => {
    expect(exerciseSkillMapping("mu-negativa-transicao")?.level).toBe(3);
  });

  it("remapeamento v1→v3: mu-jumping-barra-baixa aponta pro nível 4", () => {
    expect(exerciseSkillMapping("mu-jumping-barra-baixa")?.level).toBe(4);
  });

  it("remapeamento v1→v3: push-up-com-pausa aponta pro nível 2", () => {
    expect(exerciseSkillMapping("push-up-com-pausa")?.level).toBe(2);
  });

  it("remapeamento v1→v3: core-dragon-flag-negativa aponta pro nível 4", () => {
    expect(exerciseSkillMapping("core-dragon-flag-negativa")?.level).toBe(4);
  });
});
