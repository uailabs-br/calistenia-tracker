import { describe, it, expect } from "vitest";
import { evaluateBadges, type BadgeStats } from "@/lib/domain/badges";

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
