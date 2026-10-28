import { describe, it, expect } from "vitest";
import { longestStreakWithFreeze, streakWithFreeze } from "@/lib/domain/streak";

const T = true;
const F = false;

describe("streakWithFreeze", () => {
  it("semanas batidas seguidas somam", () => {
    expect(streakWithFreeze([T, T, T])).toBe(3);
  });

  it("falha sem proteção zera", () => {
    expect(streakWithFreeze([T, T, F])).toBe(0);
  });

  it("falha com proteção preserva sem incrementar", () => {
    // 4 batidas → 1 proteção; falha consome e mantém streak em 4
    expect(streakWithFreeze([T, T, T, T, F])).toBe(4);
  });

  it("retoma após semana protegida", () => {
    expect(streakWithFreeze([T, T, T, T, F, T])).toBe(5);
  });

  it("proteção tem teto de 2 (8 batidas → 2 freezes, 3 falhas quebram)", () => {
    expect(streakWithFreeze([T, T, T, T, T, T, T, T, F, F, F])).toBe(0);
    expect(streakWithFreeze([T, T, T, T, T, T, T, T, F, F])).toBe(8);
  });

  it("lista vazia → 0", () => {
    expect(streakWithFreeze([])).toBe(0);
  });
});

describe("longestStreakWithFreeze", () => {
  it("semana protegida não quebra o recorde (nunca fica abaixo da streak atual)", () => {
    const weeks = [T, T, T, T, F, T, T, T];
    expect(streakWithFreeze(weeks)).toBe(7);
    expect(longestStreakWithFreeze(weeks)).toBe(7);
  });

  it("guarda o pico de antes de uma quebra", () => {
    expect(longestStreakWithFreeze([T, T, T, T, T, F, F, T])).toBe(5);
  });

  it("lista vazia → 0", () => {
    expect(longestStreakWithFreeze([])).toBe(0);
  });
});
