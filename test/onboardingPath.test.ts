import { describe, expect, it } from "vitest";
import { earliestStepWeek, pathSkillId } from "@/lib/domain/onboarding";
import { getSkillById } from "@/lib/plan/skills";
import { stepDestination, stepShort } from "@/components/onboarding/questions";

describe("escada da tela final", () => {
  it("mostra a habilidade escolhida e, fora de skills, o que o Treino A treina", () => {
    expect(pathSkillId({ goal: "skills", equipment: ["barra"], focus_skills: ["muscle_up"] })).toBe("muscle_up");
    expect(pathSkillId({ goal: "skills", equipment: ["parede"] })).toBe("handstand_hold");
    expect(pathSkillId({ goal: "forca", equipment: ["barra"] })).toBe("pull_up");
    expect(pathSkillId({ goal: "definir", equipment: ["parede"] })).toBe("push_up");
  });

  // Os nomes curtos são chaveados pelo rótulo do catálogo: um renomeio lá voltaria
  // a mostrar o nome em inglês sem nenhum erro.
  it("traduz todas as etapas das escadas que a tela mostra por padrão", () => {
    expect(stepShort("Pull-up (Pronado)")).toBe("Barra (pull-up)");
    expect(stepDestination("Pull-up (Pronado)")).toBe("a sua primeira barra");
    expect(stepDestination("Tuck Planche")).toBe("Tuck Planche");
    expect(getSkillById("pull_up")!.steps.map((s) => stepShort(s.label))).toContain("Barra (pull-up)");
    expect(getSkillById("push_up")!.steps.map((s) => stepShort(s.label))).toContain("Flexão arqueiro");
  });
});

describe("primeira subida de etapa", () => {
  it("conta uma volta no ciclo até repetir o treino", () => {
    expect(earliestStepWeek(3, 2)).toBe(2);
    expect(earliestStepWeek(3, 3)).toBe(2);
    expect(earliestStepWeek(3, 4)).toBe(1);
    expect(earliestStepWeek(3, 6)).toBe(1);
  });
});
