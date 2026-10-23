import { describe, it, expect } from "vitest";
import { buildFixPrompt } from "@/lib/plan/aiFixPrompt";
import { parsePlanInput } from "@/lib/plan/importPlan";

describe("buildFixPrompt", () => {
  it("erro de schema → lista os motivos e pede o plano completo", () => {
    const result = parsePlanInput('{"id":"x","version":1}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const prompt = buildFixPrompt(result.reason, result.errors);
    expect(prompt).toContain("recusou o plano");
    expect(prompt).toContain(`- ${result.errors[0]}`);
    expect(prompt).toContain("COMPLETO");
    expect(prompt).toContain("CONTRATO DE SAÍDA");
  });

  it("corta a lista de erros longa, sem perder a contagem", () => {
    const errors = Array.from({ length: 30 }, (_, i) => `workouts.${i}.title: Required`);
    const prompt = buildFixPrompt("schema", errors);
    expect(prompt).toContain("workouts.11.title");
    expect(prompt).not.toContain("workouts.12.title");
    expect(prompt).toContain("e mais 18");
  });

  it("resposta cortada → pede compacto e não manda tirar exercício", () => {
    const prompt = buildFixPrompt("cut", ["…cortada no meio…"]);
    expect(prompt).toContain("cortada no meio");
    expect(prompt).toContain("compacto");
    expect(prompt).toContain("não tire exercício");
    // O detalhe técnico do parser não ajuda a IA: só os de schema vão listados.
    expect(prompt).not.toContain("- …cortada");
  });
});
