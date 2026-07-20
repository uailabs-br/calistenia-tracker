import { describe, it, expect } from "vitest";
import {
  estimateDurationSeconds,
  durationLabel,
} from "@/lib/domain/estimateDuration";
import type { PlanDay, PlanExercise } from "@/lib/plan/schema";

const ex = (p: Partial<PlanExercise>): PlanExercise =>
  ({ id: "x", name: "x", target: "", obs: "", flags: [], parsed: null, rest: "", ...p }) as PlanExercise;

const dayWith = (exercises: PlanExercise[], duration = "~30 min"): PlanDay =>
  ({ duration, blocks: [{ label: "b", is_skill: false, exercises }] }) as PlanDay;

describe("estimateDurationSeconds", () => {
  it("soma trabalho + descanso intra e inter exercícios", () => {
    const day = dayWith([
      ex({
        parsed: { sets: 3, target: 10, unit: "reps", per_side: false },
        rest: "descanso 60s",
      }),
      ex({
        parsed: { sets: 2, target: 20, unit: "seconds", per_side: false },
        rest: "descanso 30s",
      }),
    ]);
    // ex1: 3*30 trabalho + 2*60 intra + 60 inter = 90+120+60 = 270
    // ex2: 2*20 trabalho + 1*30 intra + 0 inter    = 40+30    = 70
    expect(estimateDurationSeconds(day)).toBe(340);
  });

  it("ignora exercícios sem parsed", () => {
    const day = dayWith([ex({ parsed: null, rest: "descanso 60s" })]);
    expect(estimateDurationSeconds(day)).toBe(0);
  });
});

describe("durationLabel", () => {
  it("mostra ~Xmin quando estimável", () => {
    const day = dayWith([
      ex({ parsed: { sets: 2, target: 60, unit: "seconds", per_side: false }, rest: "" }),
    ]);
    expect(durationLabel(day)).toBe("~2min");
  });

  it("cai no texto do plano quando não há parsed", () => {
    const day = dayWith([ex({ parsed: null })], "10-12 min");
    expect(durationLabel(day)).toBe("10-12 min");
  });
});
