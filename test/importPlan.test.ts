import { describe, it, expect } from "vitest";
import { parsePlanInput } from "@/lib/plan/importPlan";

function minimalPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-test",
    version: 1,
    name: "Plano de teste",
    source: "test",
    imported_at: "2026-08-24",
    days: [
      {
        weekday: 1,
        label: "Seg",
        title: "Dia de teste",
        skill: "Teste",
        duration: "~10 min",
        accent: "#A89CFF",
        accent_bg: "#1E1B35",
        is_practice: false,
        warmup: "aquecimento",
        tip: "dica",
        blocks: [
          {
            label: "Bloco · 10 min",
            is_skill: true,
            exercises: [
              {
                id: "ex-1",
                name: "Exercício 1",
                target: "3 × 5",
                parsed: { sets: 3, target: 5, unit: "reps", per_side: false },
                obs: "observação",
                rest: "descanso 60s",
                flags: ["flag boa", "flag ruim"],
                neg_flags: ["flag ruim"],
              },
            ],
          },
        ],
        progression: [],
      },
    ],
    ...overrides,
  };
}

describe("parsePlanInput", () => {
  it("plano válido → summary correto", () => {
    const result = parsePlanInput(JSON.stringify(minimalPlan()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.summary).toEqual({
      name: "Plano de teste",
      version: 1,
      days: 1,
      exercises: 1,
    });
  });

  it("JSON inválido → mensagem amigável", () => {
    const result = parsePlanInput("{ isso não é json");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/não parece ser um JSON válido/i);
  });

  it("envolto em cercas ```json ``` → ainda valida", () => {
    const wrapped = "```json\n" + JSON.stringify(minimalPlan()) + "\n```";
    const result = parsePlanInput(wrapped);
    expect(result.ok).toBe(true);
  });

  it("exercise_id duplicado no mesmo dia → erro legível", () => {
    const plan = minimalPlan();
    const day = plan.days[0] as { blocks: { exercises: unknown[] }[] };
    const dup = { ...(day.blocks[0].exercises[0] as object) };
    day.blocks[0].exercises.push(dup);
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /duplicado/i.test(e))).toBe(true);
  });

  it("neg_flag fora de flags → erro legível", () => {
    const plan = minimalPlan();
    const day = plan.days[0] as { blocks: { exercises: { neg_flags: string[] }[] }[] };
    day.blocks[0].exercises[0].neg_flags = ["não está em flags"];
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /neg_flag/i.test(e))).toBe(true);
  });

  it("campo obrigatório faltando → erro legível", () => {
    const plan = minimalPlan();
    delete (plan as { name?: string }).name;
    const result = parsePlanInput(JSON.stringify(plan));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
