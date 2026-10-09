import { describe, it, expect } from "vitest";
import { COACH_COPY, COACH_ORDER, pickCoachMark, type CoachId } from "@/lib/utils/coachMarks";

const all: CoachId[] = ["target", "one-tap", "flags"];

describe("pickCoachMark", () => {
  it("nada visto → a primeira da ordem de leitura (alvo, depois toque, depois chips)", () => {
    expect(pickCoachMark(all, [])).toBe("target");
  });

  it("uma por vez, na ordem, conforme vão sendo dispensadas", () => {
    expect(pickCoachMark(all, ["target"])).toBe("one-tap");
    expect(pickCoachMark(all, ["target", "one-tap"])).toBe("flags");
    expect(pickCoachMark(all, ["target", "one-tap", "flags"])).toBeNull();
  });

  it("não trava numa dica que não se aplica a este cartão", () => {
    // exercício sem alvo numérico (ex.: "10-12 tentativas"): pula "target"
    expect(pickCoachMark(["one-tap", "flags"], [])).toBe("one-tap");
    // cartão em modo ajustar: pula "one-tap"
    expect(pickCoachMark(["target", "flags"], ["target"])).toBe("flags");
  });

  it("nenhuma aplicável → null", () => {
    expect(pickCoachMark([], [])).toBeNull();
  });

  it("ignora ids desconhecidos no storage", () => {
    expect(pickCoachMark(all, ["lixo", "outro"])).toBe("target");
  });
});

describe("conteúdo", () => {
  it("toda dica da ordem tem texto", () => {
    for (const id of COACH_ORDER) expect(COACH_COPY[id].length).toBeGreaterThan(20);
  });
});
