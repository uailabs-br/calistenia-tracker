import { describe, it, expect } from "vitest";
import { reminderCopy } from "@/lib/domain/reminderCopy";

const pool = ["a", "b", "c"];

describe("reminderCopy", () => {
  it("é determinística para a mesma data", () => {
    expect(reminderCopy("2026-07-20", pool)).toBe(reminderCopy("2026-07-20", pool));
  });

  it("varia entre datas diferentes", () => {
    const picks = new Set(
      ["2026-07-20", "2026-07-21", "2026-07-22", "2026-07-23"].map((d) =>
        reminderCopy(d, pool)
      )
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("sempre retorna item do pool", () => {
    expect(pool).toContain(reminderCopy("2026-01-01", pool));
  });
});
