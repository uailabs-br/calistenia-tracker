import { describe, it, expect } from "vitest";
import type { WeekReview } from "@/lib/db/queries/weekReview";
import { nextStakeLine, weekHighlights, weekRangeLong, weekRangeShort } from "@/lib/domain/weekRecap";
import type { CampaignItem } from "@/lib/domain/campaign";

const base: WeekReview = {
  weekStart: "2026-10-19",
  weekEnd: "2026-10-25",
  sessionsDone: 4,
  planTotal: 5,
  volume: 600,
  volumeDeltaPct: 12,
  avgRpe: 3.4,
  skippedCount: 0,
  goal: 4,
  days: ["A", null, "B", null, "C", "D", null],
  records: [],
  levelsClosed: [],
  skipped: [],
};

describe("período da semana", () => {
  it("deixa claro que é de segunda a domingo", () => {
    expect(weekRangeLong("2026-10-19", "2026-10-25")).toBe("Segunda 19 a domingo 25 de outubro");
    expect(weekRangeShort("2026-10-19", "2026-10-25")).toBe("19 a 25 out");
  });

  it("semana que vira o mês leva os dois meses", () => {
    expect(weekRangeLong("2026-09-28", "2026-10-04")).toBe(
      "Segunda 28 de setembro a domingo 4 de outubro"
    );
    expect(weekRangeShort("2026-09-28", "2026-10-04")).toBe("28 set a 4 out");
  });
});

describe("weekHighlights", () => {
  it("nível, recordes numa linha só e o que ficou pra trás, até três", () => {
    const h = weekHighlights({
      ...base,
      sessionsDone: 3,
      levelsClosed: [{ skillId: "handstand_hold", skillName: "Handstand (Equilíbrio)", level: 5, levelName: "Kick-up" }],
      records: [
        { exerciseId: "a", name: "Pull-up negativa", value: 5, previous: 4, unit: "reps", date: "2026-10-21" },
        { exerciseId: "b", name: "FL hold", value: 8, previous: 7, unit: "seconds", date: "2026-10-23" },
      ],
      skipped: [{ name: "Toes to bar", count: 2 }],
    });
    expect(h.map((x) => x.text)).toEqual([
      "Handstand · nível 5 concluído",
      "2 recordes: Pull-up negativa 5 reps, FL hold 8s",
      "1 treino da meta não saiu.",
    ]);
  });

  it("semana sem nada pra destacar fica vazia", () => {
    expect(weekHighlights(base)).toEqual([]);
  });
});

describe("nextStakeLine", () => {
  const item = (streak: number, required = 2): CampaignItem => ({
    skillId: "muscle_up",
    skillName: "Muscle-up",
    level: 5,
    ladder: [],
    criteria: null,
    flags: [],
    exerciseId: "mu-completo",
    exerciseName: "MU completo",
    target: "3 × 3",
    streak,
    required,
  });

  it("diz quando o treino pode fechar o nível", () => {
    expect(nextStakeLine(item(1))).toBe("Muscle-up pode fechar o nível 5 nesse treino.");
    expect(nextStakeLine(item(0, 3))).toBe("Muscle-up · nível 5, 0 de 3 sessões.");
    expect(nextStakeLine(item(2))).toMatch(/batido/);
  });
});
