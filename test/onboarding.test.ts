import { describe, it, expect } from "vitest";
import {
  availableTags,
  mapAnswersToSkillLevels,
  seedFits,
  planIdFromPlanDayId,
  questionsFor,
  shouldRunOnboarding,
  suggestSeed,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import { getSkillById } from "@/lib/plan/skills";

const base: OnboardingAnswers = {
  equipment: "praca",
  push_up: "1-5",
  pull_up: "ainda_nao",
  handstand_hold: "nunca",
  dips: "nunca",
  days_per_week: 3,
};
const with_ = (p: Partial<OnboardingAnswers>): OnboardingAnswers => ({ ...base, ...p });

describe("mapAnswersToSkillLevels", () => {
  // Trava a tabela da spec contra a escada real: se o progressions.json for
  // renumerado (já aconteceu, v1→v3), o teste acusa em vez de gravar a etapa errada.
  const cases: [string, string, number, string][] = [
    ["push_up", "0", 0, "Flexão Inclinada"],
    ["push_up", "1-5", 1, "Flexão no Chão"],
    ["push_up", "6-15", 2, "Flexão Diamante"],
    ["push_up", "16+", 3, "Archer Push-up"],
    ["pull_up", "nunca", 0, "Dead Hang + Scapular Pull"],
    ["pull_up", "ainda_nao", 1, "Row Australiano / Ring Row"],
    ["pull_up", "1-2", 3, "Pull-up (Pronado)"],
    ["pull_up", "3-7", 4, "Pull-up Pegada Larga"],
    ["pull_up", "8+", 5, "Archer Pull-up"],
    ["handstand_hold", "nunca", 0, "Wrist Prep + Hollow Body"],
    ["handstand_hold", "segundos", 2, "Handstand com Costas à Parede"],
    ["handstand_hold", "30s", 3, "Toe-pull / Heel-pull off the wall"],
    ["handstand_hold", "solto", 5, "Handstand Livre (10-30s)"],
    ["dips", "nunca", 0, "Support Hold (Suporte Estático)"],
    ["dips", "pes_chao", 1, "Dip Negativo"],
    ["dips", "completo", 2, "Dip Completo"],
    ["dips", "8+", 3, "Ring Dip"],
  ];

  it.each(cases)("%s = %s → índice %i (%s)", (skill, answer, index, label) => {
    const levels = mapAnswersToSkillLevels(with_({ [skill]: answer } as Partial<OnboardingAnswers>));
    expect(levels[skill]).toBe(index);
    expect(getSkillById(skill)?.steps[index]?.label).toBe(label);
  });

  it("respostas mais fortes nunca dão índice menor (monotonia)", () => {
    const order: Record<string, string[]> = {
      push_up: ["0", "1-5", "6-15", "16+"],
      pull_up: ["nunca", "ainda_nao", "1-2", "3-7", "8+"],
      handstand_hold: ["nunca", "segundos", "30s", "solto"],
      dips: ["nunca", "pes_chao", "completo", "8+"],
    };
    for (const [skill, answers] of Object.entries(order)) {
      const idx = answers.map(
        (a) => mapAnswersToSkillLevels(with_({ [skill]: a } as Partial<OnboardingAnswers>))[skill]
      );
      expect(idx).toEqual([...idx].sort((x, y) => x - y));
    }
  });

  it("só devolve skills que foram perguntadas pro equipamento", () => {
    expect(Object.keys(mapAnswersToSkillLevels(with_({ equipment: "chao" }))).sort()).toEqual([
      "handstand_hold",
      "push_up",
    ]);
    expect(Object.keys(mapAnswersToSkillLevels(with_({ equipment: "casa_barra" }))).sort()).toEqual([
      "handstand_hold",
      "pull_up",
      "push_up",
    ]);
    expect(Object.keys(mapAnswersToSkillLevels(base)).sort()).toEqual([
      "dips",
      "handstand_hold",
      "pull_up",
      "push_up",
    ]);
  });

  it("ignora resposta de barra/paralelas se o equipamento não tem", () => {
    const levels = mapAnswersToSkillLevels(with_({ equipment: "chao", pull_up: "8+", dips: "8+" }));
    expect(levels.pull_up).toBeUndefined();
    expect(levels.dips).toBeUndefined();
  });
});

describe("questionsFor", () => {
  it("só o chão → 2 perguntas; barra → 3; paralelas → 4, na ordem da tela", () => {
    expect(questionsFor("chao")).toEqual(["push_up", "handstand_hold"]);
    expect(questionsFor("casa_barra")).toEqual(["push_up", "pull_up", "handstand_hold"]);
    expect(questionsFor("praca")).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
    expect(questionsFor("academia")).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
  });
});

describe("suggestSeed", () => {
  it("sem barra → iniciante-sem-barra, mesmo com flexão forte", () => {
    expect(suggestSeed(with_({ equipment: "chao", push_up: "16+" }))).toBe("iniciante-sem-barra");
  });

  it("com barra e pouca flexão ou sem barra feita → iniciante-com-barra", () => {
    expect(suggestSeed(with_({ push_up: "1-5", pull_up: "3-7" }))).toBe("iniciante-com-barra");
    expect(suggestSeed(with_({ push_up: "16+", pull_up: "ainda_nao" }))).toBe("iniciante-com-barra");
    expect(suggestSeed(with_({ push_up: "6-15", pull_up: "nunca" }))).toBe("iniciante-com-barra");
  });

  it("flexão ≥6 e barra ≥1 com paralelas → intermediario", () => {
    expect(suggestSeed(with_({ push_up: "6-15", pull_up: "1-2" }))).toBe("intermediario");
    expect(suggestSeed(with_({ equipment: "academia", push_up: "16+", pull_up: "8+" }))).toBe(
      "intermediario"
    );
  });

  it("limite: 5 flexões ainda é iniciante, 6 já não", () => {
    expect(suggestSeed(with_({ push_up: "1-5", pull_up: "1-2" }))).toBe("iniciante-com-barra");
    expect(suggestSeed(with_({ push_up: "6-15", pull_up: "1-2" }))).toBe("intermediario");
  });

  it("forte mas só com barra em casa (sem paralelas) erra pra baixo", () => {
    expect(suggestSeed(with_({ equipment: "casa_barra", push_up: "16+", pull_up: "8+" }))).toBe(
      "iniciante-com-barra"
    );
  });
});

describe("shouldRunOnboarding", () => {
  const states = [false, true];
  it("só roda quando as três condições são falsas (8 combinações)", () => {
    for (const hasSessions of states)
      for (const hasPlanOverride of states)
        for (const onboardingDone of states) {
          const expected = !hasSessions && !hasPlanOverride && !onboardingDone;
          expect(shouldRunOnboarding({ hasSessions, hasPlanOverride, onboardingDone })).toBe(expected);
        }
  });

  it("com sessão no banco nunca roda", () => {
    expect(
      shouldRunOnboarding({ hasSessions: true, hasPlanOverride: false, onboardingDone: false })
    ).toBe(false);
  });
});

describe("planIdFromPlanDayId", () => {
  it("tudo antes do último ':'", () => {
    expect(planIdFromPlanDayId("plan-calistenia-ago-2026:A")).toBe("plan-calistenia-ago-2026");
  });

  it("id de plano com hífen e dígitos", () => {
    expect(planIdFromPlanDayId("seed-iniciante-com-barra-v2:C")).toBe("seed-iniciante-com-barra-v2");
  });

  it("sufixo com ':' usa o último", () => {
    expect(planIdFromPlanDayId("plano:x:B")).toBe("plano:x");
  });

  it("vazio, nulo, sem ':' ou começando em ':' → null", () => {
    expect(planIdFromPlanDayId("")).toBeNull();
    expect(planIdFromPlanDayId(null)).toBeNull();
    expect(planIdFromPlanDayId(undefined)).toBeNull();
    expect(planIdFromPlanDayId("semdoispontos")).toBeNull();
    expect(planIdFromPlanDayId(":A")).toBeNull();
  });
});

describe("seedFits", () => {
  const SEM_BARRA = ["chão", "parede"];
  const COM_BARRA = ["chão", "parede", "barra"];
  const INTERMEDIARIO = ["chão", "parede", "barra", "paralelas"];

  it("semente que pede menos serve a quem tem mais", () => {
    expect(seedFits(SEM_BARRA, "praca")).toBe(true);
    expect(seedFits(SEM_BARRA, "casa_barra")).toBe(true);
    expect(seedFits(COM_BARRA, "academia")).toBe(true);
  });

  it("semente que pede mais não serve a quem tem menos", () => {
    expect(seedFits(COM_BARRA, "chao")).toBe(false);
    expect(seedFits(INTERMEDIARIO, "casa_barra")).toBe(false);
    expect(seedFits(INTERMEDIARIO, "chao")).toBe(false);
  });

  it("cada setup serve a si mesmo", () => {
    expect(seedFits(SEM_BARRA, "chao")).toBe(true);
    expect(seedFits(INTERMEDIARIO, "praca")).toBe(true);
  });

  it("a semente sugerida sempre serve ao equipamento informado", () => {
    expect(seedFits(availableTags("chao"), "chao")).toBe(true);
  });
});
