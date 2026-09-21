import { describe, it, expect } from "vitest";
import {
  catalog,
  catalogExerciseSchema,
  catalogSkillChips,
  getCatalogExercise,
  normalizeSearch,
  searchCatalog,
  templateToPlanExercise,
} from "@/lib/plan/catalog";
import { exerciseSkillMapping } from "@/lib/plan/skills";
import progressionsData from "@/lib/plan/progressions.json";
import { exerciseSchema } from "@/lib/plan/schema";
import { parseRestSeconds, targetSets } from "@/lib/domain/parseTarget";
import planData from "@/lib/plan/plan.json";

describe("integridade do catálogo", () => {
  it("todo item passa no schema estrito", () => {
    for (const e of catalog) {
      const r = catalogExerciseSchema.safeParse(e);
      expect(r.success, `${e.id}: ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("ids únicos, em kebab-case", () => {
    const ids = catalog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("alternativas existem e não apontam pra si", () => {
    const ids = new Set(catalog.map((e) => e.id));
    for (const e of catalog) {
      for (const ref of [...e.easier, ...e.harder]) {
        expect(ids.has(ref), `${e.id} → ${ref}`).toBe(true);
        expect(ref).not.toBe(e.id);
      }
    }
  });

  it("skill existe em progressions.json", () => {
    const skillIds = new Set(progressionsData.skills.map((s) => s.id));
    for (const e of catalog) {
      if (e.skill) expect(skillIds.has(e.skill), `${e.id}: ${e.skill}`).toBe(true);
    }
  });

  it("tentativas têm 1 série; nada de alvo sem sentido", () => {
    for (const e of catalog) {
      if (e.unit === "attempts") expect(e.sets, e.id).toBe(1);
      expect(e.target).toBeGreaterThan(0);
    }
  });

  it("ids que o mapeamento de skill já conhece têm a unidade coerente com o critério", () => {
    const want = { reps_rir: "reps", hold_clean: "seconds", skill_consistency: "attempts" } as const;
    for (const e of catalog) {
      const m = exerciseSkillMapping(e.id);
      if (!m) continue;
      expect(e.unit, `${e.id} (${m.criteria_type})`).toBe(want[m.criteria_type]);
    }
  });

  it("todo exercício do plano bundlado que existe no catálogo tem a MESMA unidade", () => {
    // mesmo id = mesmo movimento: a unidade não pode divergir do plano
    for (const d of planData.days)
      for (const b of d.blocks)
        for (const ex of b.exercises) {
          const c = getCatalogExercise(ex.id);
          if (!c || !ex.parsed) continue;
          expect(c.unit, ex.id).toBe(ex.parsed.unit);
        }
  });

  it("cobre as quatro categorias e as 16 skills", () => {
    expect(new Set(catalog.map((e) => e.category))).toEqual(
      new Set(["Puxar", "Empurrar", "Core", "Pernas"])
    );
    const covered = new Set(catalog.map((e) => e.skill).filter(Boolean));
    expect(covered.size).toBe(progressionsData.skills.length);
  });
});

describe("templateToPlanExercise", () => {
  const base = { id: "x", name: "X", per_side: false, sets: 3, target: 8, rest: 90 };

  it("reps → parsed + texto do alvo", () => {
    const ex = templateToPlanExercise({ ...base, unit: "reps" });
    expect(ex.target).toBe("3 × 8");
    expect(ex.parsed).toEqual({ sets: 3, target: 8, unit: "reps", per_side: false });
    expect(exerciseSchema.safeParse(ex).success).toBe(true);
  });

  it("segundos e por lado", () => {
    const ex = templateToPlanExercise({ ...base, unit: "seconds", per_side: true, target: 20 });
    expect(ex.target).toBe("3 × 20s/lado");
    expect(ex.parsed?.per_side).toBe(true);
  });

  it("tentativas viram 1 série", () => {
    const ex = templateToPlanExercise({ ...base, unit: "attempts", sets: 3, target: 10 });
    expect(ex.target).toBe("10 tentativas");
    expect(ex.parsed?.sets).toBe(1);
  });

  it("o texto do alvo reconstrói as mesmas séries que parsed (as_target consistente)", () => {
    for (const e of catalog.filter((c) => c.unit !== "attempts")) {
      const ex = templateToPlanExercise(e);
      expect(targetSets(ex.parsed, ex.target), e.id).toEqual(
        Array.from({ length: e.sets }, () => e.target)
      );
    }
  });

  it("descanso é legível pelo parser do app", () => {
    const ex = templateToPlanExercise({ ...base, unit: "reps", rest: 120 });
    expect(parseRestSeconds(ex.rest)).toBe(120);
  });

  it("todo item do catálogo vira um exercício válido no schema do plano", () => {
    for (const e of catalog) {
      const r = exerciseSchema.safeParse(templateToPlanExercise(e));
      expect(r.success, e.id).toBe(true);
    }
  });
});

describe("busca", () => {
  const ids = (q: string, f = {}) => searchCatalog(q, f).map((e) => e.id);

  it("normaliza acento e caixa", () => {
    expect(normalizeSearch("  Extensão  ")).toBe("extensao");
    expect(ids("BARRA FIXA")).toContain("pull-up-peso-morto");
    expect(ids("flexao")).toContain("push-up");
    expect(ids("flexão")).toContain("push-up");
  });

  it("acha por apelido em inglês e português", () => {
    expect(ids("muscle up")).toContain("mu-completo");
    expect(ids("parada de mao")).toContain("hs-livre");
    expect(ids("squat")).toContain("agachamento");
  });

  it("nome vence apelido, que vence músculo", () => {
    const r = ids("prancha");
    expect(r[0]).toBe("plank");
  });

  it("início do nome vem antes de 'contém'", () => {
    const r = ids("pull-up");
    expect(r[0].startsWith("pull-up")).toBe(true);
  });

  it("várias palavras: todas precisam casar", () => {
    const r = searchCatalog("dip argolas");
    expect(r.map((e) => e.id)).toContain("ring-dip");
    expect(r.every((e) => /dip/i.test(e.name) || e.aliases.some((a) => /dip/i.test(a)))).toBe(true);
  });

  it("busca por músculo e equipamento", () => {
    expect(ids("tríceps")).toContain("dip-paralelas");
    expect(ids("paralettes")).toContain("core-l-sit-chao");
  });

  it("sem resultado → vazio (é o gatilho do 'Criar')", () => {
    expect(ids("xyzzy inexistente")).toEqual([]);
  });

  it("sem consulta devolve o catálogo todo, e os filtros restringem", () => {
    expect(searchCatalog("")).toHaveLength(catalog.length);
    const core = searchCatalog("", { category: "Core" });
    expect(core.length).toBeGreaterThan(10);
    expect(core.every((e) => e.category === "Core")).toBe(true);
    const mu = searchCatalog("", { skill: "muscle_up" });
    expect(mu.every((e) => e.skill === "muscle_up")).toBe(true);
    expect(mu.length).toBeGreaterThan(3);
  });

  it("filtro + consulta combinam", () => {
    const r = searchCatalog("hold", { category: "Puxar" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.category === "Puxar")).toBe(true);
  });

  it("chips de skill: só skills com exercício, com contagem", () => {
    const chips = catalogSkillChips();
    expect(chips.length).toBe(progressionsData.skills.length);
    expect(chips.every((c) => c.count > 0)).toBe(true);
    expect(chips.find((c) => c.id === "muscle_up")?.name).toBeTruthy();
  });
});
