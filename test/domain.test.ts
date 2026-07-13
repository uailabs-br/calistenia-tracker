import { describe, it, expect } from "vitest";
import { targetSets, unitLabel, formatValue } from "@/lib/domain/parseTarget";
import { effectiveSets, totalVolume } from "@/lib/domain/volume";
import type { Parsed } from "@/lib/plan/schema";

const reps: Parsed = { sets: 4, target: 4, unit: "reps", per_side: false };
const secs: Parsed = { sets: 2, target: 20, unit: "seconds", per_side: false };
const perSide: Parsed = { sets: 3, target: 8, unit: "reps", per_side: true };

describe("parseTarget", () => {
  it("reconstitui séries alvo", () => {
    expect(targetSets(reps)).toEqual([4, 4, 4, 4]);
    expect(targetSets(null)).toEqual([]);
  });
  it("rótulos e formatação de unidade", () => {
    expect(unitLabel(secs)).toBe("s");
    expect(formatValue(20, secs)).toBe("20s");
    expect(formatValue(4, reps)).toBe("4");
  });
});

describe("volume", () => {
  it("as_target reconstitui do parsed", () => {
    const sets = effectiveSets(
      { as_target: true, sets: null, skipped: false },
      reps
    );
    expect(sets).toEqual([4, 4, 4, 4]);
    expect(totalVolume({ as_target: true, sets: null, skipped: false }, reps)).toBe(16);
  });
  it("usa sets ajustados quando presentes", () => {
    const log = {
      as_target: false,
      sets: [
        { index: 0, value: 4 },
        { index: 1, value: 4 },
        { index: 2, value: 3 },
      ],
      skipped: false,
    };
    expect(effectiveSets(log, reps)).toEqual([4, 4, 3]);
    expect(totalVolume(log, reps)).toBe(11);
  });
  it("skipped resulta em zero", () => {
    expect(
      totalVolume({ as_target: true, sets: null, skipped: true }, reps)
    ).toBe(0);
  });
  it("per_side dobra o volume", () => {
    expect(
      totalVolume({ as_target: true, sets: null, skipped: false }, perSide)
    ).toBe(48); // 8*3 = 24, *2 lados
  });
});
