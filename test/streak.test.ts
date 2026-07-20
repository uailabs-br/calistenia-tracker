import { describe, it, expect } from "vitest";
import { streakWithFreeze } from "@/lib/domain/streak";

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
