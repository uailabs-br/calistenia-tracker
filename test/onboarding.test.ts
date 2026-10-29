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
  suggestSeed,
  LEGACY_GEAR,
  normalizeEquipment,
  stepFitsEquipment,
  type Equipment,
  type Level,
  type OnboardingAnswers,
} from "@/lib/domain/onboarding";
import { getSkillById } from "@/lib/plan/skills";
import { getSeed } from "@/lib/plan/seeds";
import { getCatalogExercise } from "@/lib/plan/catalog";

const EQUIPMENTS: Equipment[] = Object.values(LEGACY_GEAR);

const base: OnboardingAnswers = { equipment: LEGACY_GEAR.praca, level: "intermediario", days_per_week: 3 };
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
    expect(Object.keys(mapAnswersToSkillLevels(with_({ equipment: LEGACY_GEAR.chao }))).sort()).toEqual([
      "handstand_hold",
      "push_up",
    ]);
    expect(Object.keys(mapAnswersToSkillLevels(with_({ equipment: LEGACY_GEAR.casa_barra }))).sort()).toEqual([
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
    expect(levelSkillsFor(LEGACY_GEAR.chao)).toEqual(["push_up", "handstand_hold"]);
    expect(levelSkillsFor(LEGACY_GEAR.casa_barra)).toEqual(["push_up", "pull_up", "handstand_hold"]);
    expect(levelSkillsFor(LEGACY_GEAR.praca)).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
    expect(levelSkillsFor(LEGACY_GEAR.academia)).toEqual(["push_up", "pull_up", "handstand_hold", "dips"]);
  });
});

describe("suggestSeed", () => {
  it("iniciante → corpo inteiro, com ou sem barra conforme o equipamento", () => {
    expect(suggestSeed({ equipment: LEGACY_GEAR.chao, level: "iniciante" })).toBe("iniciante-corpo-inteiro-sem-barra");
    for (const equipment of [LEGACY_GEAR.casa_barra, LEGACY_GEAR.praca, LEGACY_GEAR.academia] as const) {
      expect(suggestSeed({ equipment, level: "iniciante" })).toBe("iniciante-corpo-inteiro-com-barra");
    }
  });

  it("intermediário ou avançado sem barra → intermediario-sem-barra", () => {
    expect(suggestSeed({ equipment: LEGACY_GEAR.chao, level: "intermediario" })).toBe("intermediario-sem-barra");
    expect(suggestSeed({ equipment: LEGACY_GEAR.chao, level: "avancado" })).toBe("intermediario-sem-barra");
  });

  it("intermediário ou avançado só com barra → intermediario-com-barra", () => {
    expect(suggestSeed({ equipment: LEGACY_GEAR.casa_barra, level: "intermediario" })).toBe("intermediario-com-barra");
    expect(suggestSeed({ equipment: LEGACY_GEAR.casa_barra, level: "avancado" })).toBe("intermediario-com-barra");
  });

  it("intermediário e avançado com paralelas → intermediario (a única com dips)", () => {
    for (const equipment of [LEGACY_GEAR.praca, LEGACY_GEAR.academia] as const) {
      expect(suggestSeed({ equipment, level: "intermediario" })).toBe("intermediario");
      expect(suggestSeed({ equipment, level: "avancado" })).toBe("intermediario");
    }
  });

  it("iniciante recebe corpo inteiro: empurrar, pernas e core (e puxar, com barra) em todo treino", () => {
    for (const equipment of EQUIPMENTS) {
      const seed = getSeed(suggestSeed({ equipment, level: "iniciante" }))!;
      const need = seed.tags.includes("barra")
        ? ["Empurrar", "Pernas", "Core", "Puxar"]
        : ["Empurrar", "Pernas", "Core"];
      for (const w of seed.plan.workouts) {
        const cats = new Set(
          w.blocks.flatMap((b) => b.exercises.map((e) => getCatalogExercise(e.id)?.category))
        );
        for (const c of need) expect(cats.has(c as never), `${seed.id}/${w.id} sem ${c}`).toBe(true);
      }
    }
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
    expect(seedFits(SEM_BARRA, LEGACY_GEAR.praca)).toBe(true);
    expect(seedFits(SEM_BARRA, LEGACY_GEAR.casa_barra)).toBe(true);
    expect(seedFits(COM_BARRA, LEGACY_GEAR.academia)).toBe(true);
  });

  it("semente que pede mais não serve a quem tem menos", () => {
    expect(seedFits(COM_BARRA, LEGACY_GEAR.chao)).toBe(false);
    expect(seedFits(INTERMEDIARIO, LEGACY_GEAR.casa_barra)).toBe(false);
    expect(seedFits(INTERMEDIARIO, LEGACY_GEAR.chao)).toBe(false);
  });

  it("cada setup serve a si mesmo", () => {
    expect(seedFits(SEM_BARRA, LEGACY_GEAR.chao)).toBe(true);
    expect(seedFits(INTERMEDIARIO, LEGACY_GEAR.praca)).toBe(true);
  });

  it("a semente sugerida sempre serve ao equipamento informado", () => {
    expect(seedFits(availableTags(LEGACY_GEAR.chao), LEGACY_GEAR.chao)).toBe(true);
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
      levelFromLegacy({ equipment: LEGACY_GEAR.chao, push_up: "16+", handstand_hold: "solto" })
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

describe("equipamento como lista", () => {
  it("resposta gravada como lugar vira a lista que o lugar implicava", () => {
    expect(normalizeEquipment("praca")).toEqual(["parede", "barra", "paralelas", "banco"]);
    expect(normalizeEquipment("academia")).toContain("peso");
    expect(normalizeEquipment("chao")).toEqual(["parede"]);
  });

  it("lista gravada passa limpa, sem item desconhecido e na ordem canônica", () => {
    expect(normalizeEquipment(["barra", "trampolim", "parede"])).toEqual(["parede", "barra"]);
  });

  it("lixo vira o mínimo (só parede), nunca quebra", () => {
    expect(normalizeEquipment(null)).toEqual(["parede"]);
    expect(normalizeEquipment(42)).toEqual(["parede"]);
  });

  it("argolas declaradas liberam degrau de argola; sem elas, ficam fora", () => {
    expect(stepFitsEquipment(["rings"], ["parede", "argolas"])).toBe(true);
    expect(stepFitsEquipment(["rings"], LEGACY_GEAR.praca)).toBe(false);
  });

  it("paralelas sem barra: tem dips no mapa, mas a semente é sem barra", () => {
    expect(levelSkillsFor(["parede", "paralelas"])).toEqual(["push_up", "handstand_hold", "dips"]);
    expect(suggestSeed({ equipment: ["parede", "paralelas"], level: "intermediario" })).toBe(
      "intermediario-sem-barra"
    );
  });
});
