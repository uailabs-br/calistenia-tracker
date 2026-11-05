import { describe, it, expect } from "vitest";
import progressions from "@/lib/plan/progressions.json";
import seed from "@/lib/plan/seeds/intermediario-com-barra.json";
import { DEMO_EXERCISES, DEMO_WORKOUT, LADDER, SKILL_COUNT } from "@/components/landing/content";

// A landing copia dados do app à mão (página estática, regra 10). Estes testes
// pegam a cópia que ficou pra trás: nível inventado, contagem errada, treino que
// não existe na semente.

describe("conteúdo da landing", () => {
  it("a contagem de habilidades bate com progressions.json", () => {
    expect(progressions.skills).toHaveLength(SKILL_COUNT);
  });

  it("os três níveis são consecutivos e o critério é o do nível do meio", () => {
    const skill = progressions.skills.find((s) => s.id === LADDER.skillId);
    expect(skill).toBeDefined();
    const names = skill!.progressions.map((p) => p.name);
    const i = names.indexOf(LADDER.here);
    expect(i).toBeGreaterThan(0);
    expect(names.slice(i - 1, i + 2)).toEqual([LADDER.done, LADDER.here, LADDER.next]);

    const c = skill!.progressions[i].criteria as { type: string; sets: number; reps: number; sessions_required: number };
    expect(c.type).toBe("reps_rir");
    expect([c.sets, c.reps, c.sessions_required]).toEqual([LADDER.sets, LADDER.reps, LADDER.sessions]);
  });

  it("a demo é o primeiro treino da semente intermediária", () => {
    expect(seed.id).toBe(DEMO_WORKOUT.seedId);
    const w = seed.workouts[0];
    expect([w.label, w.title, w.duration]).toEqual([DEMO_WORKOUT.label, DEMO_WORKOUT.title, `~${DEMO_WORKOUT.estimate} min`]);

    const real = w.blocks.flatMap((b) => b.exercises).map((e) => [e.name, e.parsed.sets, e.parsed.target, e.parsed.per_side]);
    const demo = DEMO_EXERCISES.map((e) => [e.name, e.sets.length, e.sets[0], e.perSide]);
    expect(demo).toEqual(real);
  });
});
