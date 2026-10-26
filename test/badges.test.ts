import { describe, it, expect } from "vitest";
import { evaluateBadges, highlightBadge, type BadgeStats } from "@/lib/domain/badges";

const base: BadgeStats = { totalWorkouts: 0, longestStreak: 0 };
const earnedIds = (stats: BadgeStats) =>
  new Set(evaluateBadges(stats).filter((b) => b.earned).map((b) => b.id));

describe("evaluateBadges — jornada", () => {
  it("limiares exatos de treinos disparam", () => {
    expect(earnedIds({ ...base, totalWorkouts: 0 }).has("primeiro-treino")).toBe(false);
    expect(earnedIds({ ...base, totalWorkouts: 1 }).has("primeiro-treino")).toBe(true);
    expect(earnedIds({ ...base, totalWorkouts: 9 }).has("treinos-10")).toBe(false);
    expect(earnedIds({ ...base, totalWorkouts: 10 }).has("treinos-10")).toBe(true);
    expect(earnedIds({ ...base, totalWorkouts: 100 }).has("treinos-100")).toBe(true);
  });
});

describe("evaluateBadges — consistência", () => {
  it("streak de semanas destrava os selos", () => {
    expect(earnedIds({ ...base, longestStreak: 3 }).has("constancia-4")).toBe(false);
    expect(earnedIds({ ...base, longestStreak: 4 }).has("constancia-4")).toBe(true);
    expect(earnedIds({ ...base, longestStreak: 12 }).has("constancia-12")).toBe(true);
  });
});

describe("evaluateBadges — famílias", () => {
  it("só jornada e consistência (sem técnica)", () => {
    const families = new Set(evaluateBadges(base).map((b) => b.family));
    expect([...families].sort()).toEqual(["consistencia", "jornada"]);
  });
});

describe("highlightBadge", () => {
  const hl = (s: Partial<BadgeStats>) => highlightBadge({ ...base, ...s });

  it("sem nenhum selo ganho → null", () => {
    expect(hl({})).toBeNull();
  });

  it("número grande e o que ele conta, com o que falta pro próximo", () => {
    expect(hl({ totalWorkouts: 62 })).toMatchObject({
      value: 50,
      unit: "treinos",
      next: "faltam 38 pro de 100",
    });
    expect(hl({ totalWorkouts: 1 })).toMatchObject({ value: 1, unit: "treino", next: "faltam 9 pro de 10" });
    expect(hl({ totalWorkouts: 9 })?.next).toBe("falta 1 pro de 10");
  });

  it("compara famílias pela data provável: 3 meses seguidos < 50 treinos", () => {
    expect(hl({ totalWorkouts: 40, longestStreak: 12 })?.badge.id).toBe("constancia-12");
    expect(hl({ totalWorkouts: 55, longestStreak: 12 })?.badge.id).toBe("treinos-50");
    expect(hl({ totalWorkouts: 12, longestStreak: 4 })).toMatchObject({ value: 1, unit: "mês seguido" });
  });

  it("o próximo de consistência conta a partir da sequência atual", () => {
    expect(hl({ totalWorkouts: 20, longestStreak: 8, currentStreak: 2 })?.next).toBe(
      "faltam 10 semanas pros 3 meses"
    );
  });

  it("último da família não tem próximo", () => {
    expect(hl({ totalWorkouts: 120 })?.next).toBeNull();
  });
});
