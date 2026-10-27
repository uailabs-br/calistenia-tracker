import { describe, it, expect } from "vitest";
import planData from "@/lib/plan/plan.json";
import progressionsData from "@/lib/plan/progressions.json";
import { getCriteria, exerciseSkillMapping } from "@/lib/plan/skills";

// Acesso direto ao LEVEL_EXERCISE não é exportado (é implementação interna) —
// o teste passa pela API pública (exerciseSkillMapping) reconstruindo o
// conjunto de exercise_ids do plano, garantindo que cada mapeamento aponta
// pra um exercício e um nível que realmente existem.
const planExerciseIds = new Set(
  planData.workouts.flatMap((workout) =>
    workout.blocks.flatMap((block) => block.exercises.map((ex) => ex.id))
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

  it("v3.1: MU completo é o muscle-up estrito (nível 5)", () => {
    expect(exerciseSkillMapping("mu-completo")).toEqual({
      skill_id: "muscle_up",
      level: 5,
      criteria_type: "reps_rir",
    });
  });

  it("v3.1: nível 4 do handstand é o toe-pull; a negativa do frog é do press de braço flexionado", () => {
    expect(exerciseSkillMapping("hs-toe-pull")).toMatchObject({ skill_id: "handstand_hold", level: 4 });
    expect(exerciseSkillMapping("hs-frog-press")).toMatchObject({ skill_id: "bent_arm_press", level: 3 });
    expect(exerciseSkillMapping("hs-headstand-press")).toMatchObject({ skill_id: "bent_arm_press", level: 4 });
  });

  it("v3.1: press de braço estendido segue o Overcoming Gravity, straddle antes do pike", () => {
    const levels = ["press-compressao", "press-straddle-negativo", "press-straddle-elevado", "press-straddle", "press-pike"]
      .map((id) => exerciseSkillMapping(id));
    expect(levels.map((m) => m?.skill_id)).toEqual(Array(5).fill("press_handstand"));
    expect(levels.map((m) => m?.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("fl-single-leg-hold é o nível 3 do front lever (sem ele o objetivo não anda)", () => {
    expect(exerciseSkillMapping("fl-single-leg-hold")).toEqual({
      skill_id: "front_lever",
      level: 3,
      criteria_type: "hold_clean",
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

describe("revisão das escadas v3.1 (Overcoming Gravity 2)", () => {
  const names = (id: string) =>
    progressionsData.skills.find((s) => s.id === id)!.progressions.map((p) => p.name);

  it("parallettes não vêm depois do L-sit no chão: o 4 é o straddle L-sit", () => {
    expect(names("l_sit")[3]).toBe("Straddle L-sit");
  });

  it("MU nas argolas não é degrau acima do estrito na barra", () => {
    expect(names("muscle_up").some((n) => /argolas/i.test(n))).toBe(false);
  });

  it("degraus que faltavam: one-arm elevado e back lever de uma perna", () => {
    const pu = names("push_up");
    expect(pu.indexOf("One-Arm Push-up Elevado")).toBe(pu.indexOf("One-Arm Push-up") - 1);
    const bl = names("back_lever");
    expect(bl.indexOf("Half Lay / One-Leg Back Lever")).toBe(bl.indexOf("Full Back Lever") - 1);
  });

  it("handstand segue pro one-arm, não pra pirueta", () => {
    const hs = names("handstand_hold");
    expect(hs.at(-1)).toBe("One-Arm Handstand");
    expect(hs.some((n) => /pirueta/i.test(n))).toBe(false);
  });
});
