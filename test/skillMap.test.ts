import { describe, it, expect } from "vitest";
import { skillPosition, stepStatus } from "@/lib/domain/skillMap";

// escada com etapas mapeadas (a,b,c) e marcos sem exercício (labels) + goal
const steps = [
  { exercise_id: "a" },
  { exercise_id: "b" },
  {}, // marco canônico fora do plano
  { exercise_id: "c" },
  {}, // objetivo final
];

describe("skillPosition", () => {
  it("nada conquistado → foco na 1ª etapa", () => {
    expect(skillPosition(steps, new Set())).toBe(0);
  });

  it("etapa mapeada conquistada → foco logo depois", () => {
    expect(skillPosition(steps, new Set(["a"]))).toBe(1);
  });

  it("conquista avançada arrasta os marcos anteriores como concluídos", () => {
    // 'c' (índice 3) conquistado → posição 4, mesmo com o marco do índice 2 sem exercício
    expect(skillPosition(steps, new Set(["c"]))).toBe(4);
  });

  it("usa a etapa mapeada mais avançada, não a contagem", () => {
    expect(skillPosition(steps, new Set(["a", "b"]))).toBe(2);
  });
});

describe("stepStatus", () => {
  it("classifica done/focus/locked em torno da posição", () => {
    expect(stepStatus(0, 2)).toBe("done");
    expect(stepStatus(2, 2)).toBe("focus");
    expect(stepStatus(3, 2)).toBe("locked");
  });
});
