import { describe, it, expect } from "vitest";
import { RETURN_AFTER_DAYS, returnNudge } from "@/lib/domain/returnNudge";

// 2026-11-02 é segunda; 2026-11-08, domingo.
describe("returnNudge", () => {
  it("estreante (sem treino nenhum) não recebe card de volta", () => {
    expect(returnNudge({ lastWorkoutDate: null, today: "2026-11-02", weekGoal: 3 })).toBeNull();
  });

  it("pausa curta não aparece", () => {
    const today = "2026-11-08";
    expect(returnNudge({ lastWorkoutDate: "2026-11-02", today, weekGoal: 3 })).toBeNull();
  });

  it(`a partir de ${RETURN_AFTER_DAYS} dias aparece, com os dias contados`, () => {
    const r = returnNudge({ lastWorkoutDate: "2026-10-26", today: "2026-11-04", weekGoal: 3 });
    expect(r?.days).toBe(9);
  });

  it("com dias sobrando na semana, ainda dá pra bater a meta", () => {
    // quarta: quarta a domingo são 5 dias, meta 3
    const r = returnNudge({ lastWorkoutDate: "2026-10-26", today: "2026-11-04", weekGoal: 3 });
    expect(r?.line).toBe("Voltar hoje já conta, e ainda dá pra bater a meta da semana.");
  });

  it("perto do domingo mostra o que ainda cabe, não a meta cheia", () => {
    const sabado = returnNudge({ lastWorkoutDate: "2026-10-26", today: "2026-11-07", weekGoal: 3 });
    expect(sabado?.line).toBe("Voltar hoje já conta. Até domingo ainda cabem 2 treinos.");
    const domingo = returnNudge({ lastWorkoutDate: "2026-10-26", today: "2026-11-08", weekGoal: 3 });
    expect(domingo?.line).toBe("Voltar hoje já conta. Até domingo ainda cabe 1 treino.");
  });
});
