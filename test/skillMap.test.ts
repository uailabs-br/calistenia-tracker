import { describe, it, expect } from "vitest";
import { chainPosition, stepStatus } from "@/lib/domain/skillMap";
import type { Progression } from "@/lib/plan/schema";

const step = (exercise_id: string | null): Progression =>
  ({ exercise_id, criteria: "" }) as Progression;

// cadeia estilo MU: 3 passos + goal
const chain = [step("a"), step("b"), step("c"), step(null)];

describe("chainPosition", () => {
  it("nenhum conquistado → foco no 1º passo", () => {
    expect(chainPosition(chain, new Set())).toBe(0);
  });

  it("dois primeiros conquistados → foco no 3º", () => {
    expect(chainPosition(chain, new Set(["a", "b"]))).toBe(2);
  });

  it("todos os passos com id conquistados → foco no goal", () => {
    expect(chainPosition(chain, new Set(["a", "b", "c"]))).toBe(3);
  });

  it("conquista fora de ordem não pula o passo pendente anterior", () => {
    // 'c' feito mas 'b' não → foco continua em 'b' (índice 1)
    expect(chainPosition(chain, new Set(["a", "c"]))).toBe(1);
  });
});

describe("stepStatus", () => {
  it("classifica done/focus/locked em torno da posição", () => {
    expect(stepStatus(0, 2)).toBe("done");
    expect(stepStatus(2, 2)).toBe("focus");
    expect(stepStatus(3, 2)).toBe("locked");
  });
});
