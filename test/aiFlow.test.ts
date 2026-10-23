import { describe, it, expect } from "vitest";
import { AI_FLOW_TTL_MS, FLOW_STEPS, parseAiFlow } from "@/lib/utils/aiFlow";

const NOW = 1_800_000_000_000;

describe("parseAiFlow", () => {
  it("estado recente → volta como foi salvo", () => {
    const raw = JSON.stringify({ mode: "meu", copied: true, ownWorkout: "Treino A", savedAt: NOW - 1000 });
    expect(parseAiFlow(raw, NOW)).toEqual({
      mode: "meu",
      copied: true,
      ownWorkout: "Treino A",
      savedAt: NOW - 1000,
    });
  });

  it("vencido → null, pra quem volta dias depois começar do zero", () => {
    const raw = JSON.stringify({ mode: "novo", copied: true, ownWorkout: "", savedAt: NOW - AI_FLOW_TTL_MS - 1 });
    expect(parseAiFlow(raw, NOW)).toBeNull();
  });

  it("lixo, modo desconhecido ou data no futuro → null", () => {
    expect(parseAiFlow(null, NOW)).toBeNull();
    expect(parseAiFlow("{não é json", NOW)).toBeNull();
    expect(parseAiFlow(JSON.stringify({ mode: "pronto", savedAt: NOW }), NOW)).toBeNull();
    expect(parseAiFlow(JSON.stringify({ mode: "novo", savedAt: NOW + 60_000 }), NOW)).toBeNull();
  });

  it("campos faltando viram o padrão seguro", () => {
    const parsed = parseAiFlow(JSON.stringify({ mode: "novo", savedAt: NOW }), NOW);
    expect(parsed).toMatchObject({ copied: false, ownWorkout: "" });
  });
});

describe("FLOW_STEPS", () => {
  it("os dois caminhos terminam em copiar → colar", () => {
    for (const steps of Object.values(FLOW_STEPS)) {
      expect(steps.slice(-2)).toEqual(["copiar", "colar"]);
    }
  });
});
