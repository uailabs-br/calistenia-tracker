import { describe, it, expect } from "vitest";
import {
  workoutIdFor,
  isLegacyPlan,
  convertLegacyPlan,
  legacyWeekdayMap,
  legacyWeekdayMapFromStorage,
} from "@/lib/plan/legacyPlan";
import { planSchema } from "@/lib/plan/schema";

const day = (weekday: number, title: string) => ({
  weekday,
  label: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][weekday],
  title,
  skill: "Teste",
  duration: "~10 min",
  accent: "#A89CFF",
  accent_bg: "#1E1B35",
  is_practice: false,
  warmup: "aquecimento",
  tip: "dica",
  blocks: [
    {
      label: "Bloco",
      is_skill: false,
      exercises: [
        {
          id: `ex-${weekday}`,
          name: "Exercício",
          target: "3 × 5",
          parsed: { sets: 3, target: 5, unit: "reps", per_side: false },
          obs: "",
          rest: "descanso 60s",
          flags: [],
        },
      ],
    },
  ],
  progression: [],
});

const legacy = {
  id: "p-legacy",
  version: 1,
  name: "Plano antigo",
  source: "teste",
  imported_at: "2026-08-01",
  days: [day(4, "Quinta"), day(2, "Terça"), day(6, "Sábado")],
};

describe("workoutIdFor", () => {
  it("A–Z e depois AA, AB… (estilo planilha)", () => {
    expect(workoutIdFor(0)).toBe("A");
    expect(workoutIdFor(4)).toBe("E");
    expect(workoutIdFor(25)).toBe("Z");
    expect(workoutIdFor(26)).toBe("AA");
    expect(workoutIdFor(27)).toBe("AB");
  });
});

describe("isLegacyPlan", () => {
  it("reconhece agenda por dias e não confunde com o formato novo", () => {
    expect(isLegacyPlan(legacy)).toBe(true);
    expect(isLegacyPlan({ ...legacy, days: undefined, workouts: [] })).toBe(false);
    expect(isLegacyPlan(null)).toBe(false);
    expect(isLegacyPlan("texto")).toBe(false);
  });
});

describe("convertLegacyPlan", () => {
  it("ordena pelo weekday e atribui letras em sequência, não pelo weekday em si", () => {
    const out = convertLegacyPlan(legacy) as { workouts: { id: string; label: string; title: string }[] };
    expect(out.workouts.map((w) => [w.id, w.label, w.title])).toEqual([
      ["A", "A", "Terça"],
      ["B", "B", "Quinta"],
      ["C", "C", "Sábado"],
    ]);
  });

  it("remove weekday e days do resultado", () => {
    const out = convertLegacyPlan(legacy) as Record<string, unknown>;
    expect(out).not.toHaveProperty("days");
    expect(out.workouts).toBeDefined();
    expect(JSON.stringify(out)).not.toContain("weekday");
  });

  it("resultado passa no schema do plano novo", () => {
    const out = convertLegacyPlan(legacy);
    expect(planSchema.safeParse(out).success).toBe(true);
  });

  it("weekdays iguais: a ordem do arquivo desempata", () => {
    const out = convertLegacyPlan({
      ...legacy,
      days: [day(3, "Primeiro"), day(3, "Segundo")],
    }) as { workouts: { id: string; title: string }[] };
    expect(out.workouts.map((w) => [w.id, w.title])).toEqual([
      ["A", "Primeiro"],
      ["B", "Segundo"],
    ]);
  });
});

describe("legacyWeekdayMap", () => {
  it("mapeia cada weekday ao id que a conversão lhe deu", () => {
    const map = legacyWeekdayMap(legacy.days);
    expect(map.get(2)).toBe("A");
    expect(map.get(4)).toBe("B");
    expect(map.get(6)).toBe("C");
    expect(map.get(1)).toBeUndefined();
  });
});

describe("legacyWeekdayMapFromStorage", () => {
  it("sem override → padrão bundlado Seg–Sex (1→A … 5→E)", () => {
    const map = legacyWeekdayMapFromStorage(null);
    expect([...map.entries()]).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
      [4, "D"],
      [5, "E"],
    ]);
  });

  it("override antigo ilegível → padrão bundlado", () => {
    expect(legacyWeekdayMapFromStorage("{não é json").get(1)).toBe("A");
  });

  it("override antigo válido → mapa do próprio plano importado", () => {
    const map = legacyWeekdayMapFromStorage(JSON.stringify(legacy));
    expect(map.get(2)).toBe("A");
    expect(map.get(6)).toBe("C");
  });

  it("override já no formato novo não é mapeável → padrão bundlado", () => {
    const raw = JSON.stringify({ ...legacy, days: undefined, workouts: [] });
    expect(legacyWeekdayMapFromStorage(raw).get(1)).toBe("A");
  });
});
