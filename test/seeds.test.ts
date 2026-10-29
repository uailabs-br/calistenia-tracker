import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { planSchema } from "@/lib/plan/schema";
import { DEFAULT_SEED_ID, getSeed, isSeedPlanId, listedSeeds, seeds } from "@/lib/plan/seeds";
import { getKnownPlan, knownPlanIds } from "@/lib/plan/plans";
import { seedFits, suggestSeed } from "@/lib/domain/onboarding";
import { LEGACY_GEAR } from "@/lib/domain/onboarding";
import { skillIdForWorkout } from "@/lib/plan/skills";
import { planWarnings } from "@/lib/plan/diffPlan";

type CatalogEntry = { id: string; equipment: string[] };
const catalog: CatalogEntry[] = JSON.parse(
  readFileSync(resolve(__dirname, "../lib/plan/catalog.json"), "utf8")
);
const byId = new Map(catalog.map((e) => [e.id, e]));

describe.each(seeds)("semente $id", (seed) => {
  it("passa o planSchema", () => {
    const r = planSchema.safeParse(seed.plan);
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues)).toBe(true);
  });

  it("tem 3 treinos com ids únicos (A, B, C)", () => {
    expect(seed.plan.workouts.map((w) => w.id)).toEqual(["A", "B", "C"]);
  });

  it("alvo de degrau na unidade do critério (senão o degrau nunca fecha)", () => {
    const unit = planWarnings(seed.plan, seed.plan).filter((w) => w.message.includes("é medido em"));
    expect(unit.map((w) => w.message)).toEqual([]);
  });

  it("todo exercise.id existe no catálogo", () => {
    for (const w of seed.plan.workouts)
      for (const b of w.blocks)
        for (const e of b.exercises) expect(byId.has(e.id), `${seed.id}/${w.id}/${e.id}`).toBe(true);
  });

  it("todo exercício usa ao menos um equipamento que a semente permite", () => {
    for (const w of seed.plan.workouts)
      for (const b of w.blocks)
        for (const e of b.exercises) {
          const equip = byId.get(e.id)!.equipment;
          expect(
            equip.some((t) => seed.tags.includes(t)),
            `${seed.id}/${e.id} precisa de ${equip.join("/")}`
          ).toBe(true);
        }
  });

  it("neg_flags é subconjunto de flags e todo exercício tem ao menos uma neg_flag", () => {
    for (const w of seed.plan.workouts)
      for (const b of w.blocks)
        for (const e of b.exercises) {
          expect((e.neg_flags ?? []).every((n) => e.flags.includes(n))).toBe(true);
          expect((e.neg_flags ?? []).length, `${seed.id}/${e.id} sem neg_flag`).toBeGreaterThan(0);
        }
  });

  it("o alvo em texto bate com o parsed", () => {
    for (const w of seed.plan.workouts)
      for (const b of w.blocks)
        for (const e of b.exercises) {
          expect(e.parsed).not.toBeNull();
          expect(e.target.startsWith(`${e.parsed!.sets} × ${e.parsed!.target}`)).toBe(true);
        }
  });

  it("a progressão só cita exercícios do treino", () => {
    for (const w of seed.plan.workouts) {
      const ids = new Set(w.blocks.flatMap((b) => b.exercises.map((e) => e.id)));
      for (const p of w.progression) expect(ids.has(p.exercise_id!)).toBe(true);
    }
  });
});

describe("registro de sementes", () => {
  it("o plan.json bundlado é idêntico ao iniciante-com-barra (trava o default)", () => {
    // Lê do disco: o alias do vitest aponta `plan.json` pro plano pessoal.
    const bundled = JSON.parse(readFileSync(resolve(__dirname, "../lib/plan/plan.json"), "utf8"));
    expect(bundled).toEqual(getSeed(DEFAULT_SEED_ID)!.plan);
  });

  it("ids de plano são únicos entre sementes e plano pessoal", () => {
    const ids = knownPlanIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("plan-calistenia-ago-2026");
  });

  it("getKnownPlan resolve sementes e o plano pessoal, e ignora desconhecido", () => {
    expect(getKnownPlan("seed-intermediario")?.name).toMatch(/Intermediário/);
    expect(getKnownPlan("plan-calistenia-ago-2026")?.workouts).toHaveLength(5);
    expect(getKnownPlan("plano-que-nao-existe")).toBeUndefined();
  });

  it("toda semente sugerida por suggestSeed existe no registro", () => {
    for (const equipment of [LEGACY_GEAR.chao, LEGACY_GEAR.casa_barra, LEGACY_GEAR.praca, LEGACY_GEAR.academia] as const) {
      for (const level of ["iniciante", "intermediario", "avancado"] as const) {
        const id = suggestSeed({ equipment, level });
        expect(getSeed(id), id).toBeDefined();
      }
    }
  });

  it("toda semente sugerida está na lista de escolha", () => {
    const listed = new Set(listedSeeds().map((s) => s.id));
    for (const equipment of [LEGACY_GEAR.chao, LEGACY_GEAR.casa_barra, LEGACY_GEAR.praca, LEGACY_GEAR.academia] as const)
      for (const level of ["iniciante", "intermediario", "avancado"] as const)
        expect(listed.has(suggestSeed({ equipment, level })), `${equipment.join("+")}/${level}`).toBe(true);
  });

  it("as divididas antigas saem da lista mas seguem conhecidas pelo histórico", () => {
    for (const id of ["iniciante-sem-barra", "iniciante-com-barra"] as const) {
      expect(listedSeeds().some((s) => s.id === id)).toBe(false);
      expect(getKnownPlan(getSeed(id)!.plan.id)).toBeDefined();
    }
  });

  it("praça só com barra recebe o intermediário sem paralelas, não o que depende delas", () => {
    const pracaSoBarra = ["parede", "barra", "banco"] as const;
    expect(suggestSeed({ equipment: pracaSoBarra, level: "intermediario" })).toBe("intermediario-com-barra");
  });
});

describe("tags das sementes x equipamento", () => {
  it("a semente sugerida sempre é executável com o equipamento informado", () => {
    const combos = [LEGACY_GEAR.chao, LEGACY_GEAR.casa_barra, LEGACY_GEAR.praca, LEGACY_GEAR.academia] as const;
    for (const equipment of combos)
      for (const level of ["iniciante", "intermediario", "avancado"] as const) {
        const id = suggestSeed({ equipment, level });
        expect(seedFits(getSeed(id)!.tags, equipment), `${equipment.join("+")}/${level} → ${id}`).toBe(true);
      }
  });
});

describe("sementes alimentam o motor de progressão", () => {
  it("todo exercício declara skill_ref (objeto ou null explícito)", () => {
    for (const seed of seeds)
      for (const w of seed.plan.workouts)
        for (const b of w.blocks)
          for (const e of b.exercises)
            expect(e.skill_ref !== undefined, `${seed.id}/${e.id}`).toBe(true);
  });

  it("cada semente liga pelo menos 5 exercícios a uma etapa de skill", () => {
    for (const seed of seeds) {
      const n = seed.plan.workouts
        .flatMap((w) => w.blocks.flatMap((b) => b.exercises))
        .filter((e) => e.skill_ref).length;
      expect(n, seed.id).toBeGreaterThanOrEqual(5);
    }
  });

  it("o rótulo de skill de cada treino resolve numa skill do catálogo", () => {
    for (const seed of seeds)
      for (const w of seed.plan.workouts)
        expect(skillIdForWorkout(w.skill), `${seed.id}/${w.id}: ${w.skill}`).toBeDefined();
  });
});

describe("isSeedPlanId", () => {
  it("reconhece o id de cada semente", () => {
    for (const seed of seeds) expect(isSeedPlanId(seed.plan.id)).toBe(true);
  });
  it("plano de IA ou pessoal não é semente", () => {
    expect(isSeedPlanId("ciclo-mu-2026-10")).toBe(false);
    expect(isSeedPlanId("plan-calistenia-ago-2026")).toBe(false);
  });
});
