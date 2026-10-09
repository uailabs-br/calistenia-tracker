import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { planSchema } from "@/lib/plan/schema";
import { DEFAULT_SEED_ID, getSeed, seeds } from "@/lib/plan/seeds";
import { getKnownPlan, knownPlanIds } from "@/lib/plan/plans";
import { suggestSeed } from "@/lib/domain/onboarding";

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
    for (const equipment of ["chao", "casa_barra", "praca", "academia"] as const) {
      const id = suggestSeed({
        equipment,
        push_up: "16+",
        pull_up: "8+",
        handstand_hold: "nunca",
        dips: "8+",
        days_per_week: 3,
      });
      expect(getSeed(id), id).toBeDefined();
    }
  });

  it("as sementes cobrem todos os equipamentos", () => {
    const covered = new Set(seeds.flatMap((s) => s.equipment));
    expect([...covered].sort()).toEqual(["academia", "casa_barra", "chao", "praca"]);
  });
});
