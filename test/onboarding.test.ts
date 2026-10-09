import { describe, it, expect } from "vitest";
import {
  GOALS,
  LEVELS,
  aboveTopSeed,
  availableTags,
  levelFromLegacy,
  levelSkillsFor,
  mapAnswersToSkillLevels,
  planIdFromPlanDayId,
  seedFits,
  shouldRunOnboarding,
  skipSeed,
  suggestSeed,
  type Equipment,
  type Level,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import { getSkillById } from "@/lib/plan/skills";
import { DEFAULT_SEED_ID, getSeed } from "@/lib/plan/seeds";

const EQUIPMENTS: Equipment[] = ["chao", "casa_barra", "praca", "academia"];

const base: OnboardingAnswers = { equipment: "praca", level: "intermediario", days_per_week: 3 };
const with_ = (p: Partial<OnboardingAnswers>): OnboardingAnswers => ({ ...base, ...p });

describe("mapAnswersToSkillLevels", () => {
  // Trava as posições contra a escada real: se o progressions.json for
  // renumerado (já aconteceu, v1→v3), o teste acusa em vez de gravar a etapa errada.
  const cases: [Level, string, number, string][] = [
    ["intermediario", "push_up", 2, "Flexão Diamante"],
    ["intermediario", "pull_up", 3, "Pull-up (Pronado)"],
    ["intermediario", "handstand_hold", 2, "Handstand com Costas à Parede"],
    ["intermediario", "dips", 2, "Dip Completo"],
    ["avancado", "push_up", 3, "Archer Push-up"],
    ["avancado", "pull_up", 5, "Archer Pull-up"],
    ["avancado", "handstand_hold", 5, "Handstand Livre (10-30s)"],
    ["avancado", "dips", 3, "Ring Dip"],
    ["iniciante", "push_up", 0, "Flexão Inclinada"],
    ["iniciante", "pull_up", 0, "Dead Hang + Scapular Pull"],
    ["iniciante", "handstand_hold", 0, "Wrist Prep + Hollow Body"],
    ["iniciante", "dips", 0, "Support Hold (Suporte Estático)"],
  ];

  it.each(cases)("%s / %s → índice %i (%s)", (level, skill, index, label) => {
    const levels = mapAnswersToSkillLevels(with_({ level }));
    expect(levels[skill]).toBe(index);
    expect(getSkillById(skill)?.steps[index]?.label).toBe(label);
  });

  it("nível mais alto nunca dá posição menor em nenhuma skill (monotonia)", () => {
    const by = LEVELS.map((level) => mapAnswersToSkillLevels(with_({ level })));
    for (const skill of Object.keys(by[0])) {
      const idx = by.map((l) => l[skill]);
      expect(idx).toEqual([...idx].sort((x, y) => x - y));
    }
  });

  it("só devolve as skills que o equipamento permite", () => {
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
});

describe("levelSkillsFor", () => {
  it("só o chão → 2 skills; barra → 3; paralelas → 4, na ordem do resumo", () => {
    expect(levelSkillsFor("chao")).toEqual(["push_up", "handstand_hold"]);
    expect(levelSkillsFor("casa_barra")).toEqual(["push_up", "pull_up", "handstand_hold"]);
    expect(levelSkillsFor("praca")).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
    expect(levelSkillsFor("academia")).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
  });
});

describe("suggestSeed", () => {
  it("sem barra → iniciante-sem-barra, em qualquer nível", () => {
    for (const level of LEVELS) {
      expect(suggestSeed({ equipment: "chao", level })).toBe("iniciante-sem-barra");
    }
  });

  it("iniciante com barra → iniciante-com-barra, mesmo com paralelas", () => {
    for (const equipment of ["casa_barra", "praca", "academia"] as const) {
      expect(suggestSeed({ equipment, level: "iniciante" })).toBe("iniciante-com-barra");
    }
  });

  it("intermediário e avançado com paralelas → intermediario", () => {
    for (const equipment of ["praca", "academia"] as const) {
      expect(suggestSeed({ equipment, level: "intermediario" })).toBe("intermediario");
      expect(suggestSeed({ equipment, level: "avancado" })).toBe("intermediario");
    }
  });

  it("forte mas só com barra em casa (sem paralelas) erra pra baixo", () => {
    expect(suggestSeed({ equipment: "casa_barra", level: "avancado" })).toBe("iniciante-com-barra");
  });

  it("a semente sugerida sempre serve ao equipamento informado", () => {
    for (const equipment of EQUIPMENTS) {
      for (const level of LEVELS) {
        expect(seedFits(getSeed(suggestSeed({ equipment, level }))!.tags, equipment)).toBe(true);
      }
    }
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

describe("GOALS", () => {
  it("são gerais: nenhum objetivo depende de equipamento nem aponta uma skill", () => {
    expect(GOALS).toEqual(["forca", "resistencia", "skills", "mobilidade"]);
  });
});

describe("aboveTopSeed", () => {
  it("só o avançado está acima das sementes", () => {
    expect(aboveTopSeed({ level: "avancado" })).toBe(true);
    expect(aboveTopSeed({ level: "intermediario" })).toBe(false);
    expect(aboveTopSeed({ level: "iniciante" })).toBe(false);
  });
});

describe("skipSeed", () => {
  it("pular antes de responder o equipamento aplica o padrão do bundle", () => {
    for (const equipment of EQUIPMENTS) {
      expect(skipSeed({ equipmentAnswered: false, equipment })).toBe(DEFAULT_SEED_ID);
    }
  });

  it("pular depois de marcar 'só o chão' NÃO aplica um plano que pede barra", () => {
    const id = skipSeed({ equipmentAnswered: true, equipment: "chao" });
    expect(id).toBe("iniciante-sem-barra");
    expect(seedFits(getSeed(id)!.tags, "chao")).toBe(true);
  });

  it("pular nunca aplica o intermediario: o nível não respondido é o menor", () => {
    for (const equipment of EQUIPMENTS) {
      const id = skipSeed({ equipmentAnswered: true, equipment });
      expect(id).not.toBe("intermediario");
      expect(seedFits(getSeed(id)!.tags, equipment)).toBe(true);
    }
  });
});

describe("levelFromLegacy", () => {
  // Respostas gravadas antes da pergunta de nível: 4 perguntas de capacidade.
  const praca = {
    equipment: "praca" as const,
    push_up: "0" as const,
    pull_up: "nunca" as const,
    handstand_hold: "nunca" as const,
    dips: "nunca" as const,
  };

  it("tudo no mínimo → iniciante", () => {
    expect(levelFromLegacy(praca)).toBe("iniciante");
  });

  it("alcança a faixa do intermediário em TODA skill → intermediario", () => {
    expect(
      levelFromLegacy({ ...praca, push_up: "6-15", pull_up: "1-2", handstand_hold: "segundos", dips: "completo" })
    ).toBe("intermediario");
  });

  it("tudo no máximo → avancado", () => {
    expect(
      levelFromLegacy({ ...praca, push_up: "16+", pull_up: "8+", handstand_hold: "solto", dips: "8+" })
    ).toBe("avancado");
  });

  it("uma skill abaixo da faixa derruba o nível inteiro (erra pra baixo)", () => {
    expect(
      levelFromLegacy({ ...praca, push_up: "16+", pull_up: "8+", handstand_hold: "segundos", dips: "8+" })
    ).toBe("intermediario");
    expect(
      levelFromLegacy({ ...praca, push_up: "16+", pull_up: "ainda_nao", handstand_hold: "solto", dips: "8+" })
    ).toBe("iniciante");
  });

  it("só considera as skills que o equipamento perguntava", () => {
    // só o chão: barra e dips nunca foram perguntadas, não podem reprovar
    expect(
      levelFromLegacy({ equipment: "chao", push_up: "16+", handstand_hold: "solto" })
    ).toBe("avancado");
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
