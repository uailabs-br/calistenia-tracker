import { describe, it, expect } from "vitest";
import { heatLevel } from "@/lib/domain/heatLevel";

describe("heatLevel", () => {
  it("futuro vence tudo, mesmo com contagem", () => {
    expect(heatLevel({ count: 0, future: true })).toBe("future");
    expect(heatLevel({ count: 3, future: true })).toBe("future");
  });
  it("sem treino → empty", () => {
    expect(heatLevel({ count: 0, future: false })).toBe("empty");
  });
  it("1 treino → one, 2 ou mais → many", () => {
    expect(heatLevel({ count: 1, future: false })).toBe("one");
    expect(heatLevel({ count: 2, future: false })).toBe("many");
    expect(heatLevel({ count: 5, future: false })).toBe("many");
  });
});
