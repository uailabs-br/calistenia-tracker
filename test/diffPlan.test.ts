import { describe, it, expect } from "vitest";
import { diffPlans } from "@/lib/plan/diffPlan";
import type { Plan, PlanExercise, Workout } from "@/lib/plan/schema";

// Planos montados aqui: o teste não pode depender do plano pessoal do autor.
const ex = (id: string, target: string, extra: Partial<PlanExercise> = {}): PlanExercise => ({
  id,
  name: id,
  target,
  parsed: null,
  obs: "",
  rest: "descanso 60s",
  flags: [],
  ...extra,
});
const workout = (id: string, exercises: PlanExercise[]): Workout => ({
  id,
  label: id,
  title: `Treino ${id}`,
  skill: "Barra",
  duration: "30 min",
  accent: "#8174E8",
  accent_bg: "#1D1B2B",
  is_practice: false,
  warmup: "",
  tip: "",
  blocks: [{ label: "b", is_skill: true, exercises }],
  progression: [],
});
const plan = (workouts: Workout[], id = "p"): Plan => ({
  id,
  version: 1,
  name: "P",
  source: "t",
  imported_at: "2026-10-22",
  workouts,
});

describe("diffPlans", () => {
  const current = plan([
    workout("A", [ex("push-up", "3 × 8"), ex("plank", "3 × 20s")]),
    workout("B", [ex("agachamento", "3 × 10")]),
  ]);

  it("separa o que entra, sai e continua em cada treino", () => {
    const next = plan([
      workout("A", [ex("push-up", "3 × 10"), ex("dip-paralelas", "3 × 6")]),
      workout("B", [ex("agachamento", "3 × 10")]),
    ]);
    const diff = diffPlans(current, next);
    const a = diff.workouts.find((w) => w.id === "A")!;

    expect(a.entering.map((e) => e.id)).toEqual(["dip-paralelas"]);
    expect(a.leaving.map((e) => e.id)).toEqual(["plank"]);
    expect(a.kept).toEqual([
      { id: "push-up", name: "push-up", target: "3 × 10", from: "3 × 8" },
    ]);
    expect(diff.totals).toMatchObject({
      entering: 1,
      leaving: 1,
      kept: 2,
      retargeted: 1,
      newMovements: 1,
      droppedMovements: 1,
    });
    expect(diff.samePlan).toBe(true);
  });

  it("treino que some do plano aparece como removido, e o novo como novo", () => {
    const next = plan([workout("A", [ex("push-up", "3 × 8")]), workout("C", [ex("hs", "3 × 20s")])]);
    const byId = Object.fromEntries(diffPlans(current, next).workouts.map((w) => [w.id, w]));
    expect(byId.B.status).toBe("removed");
    expect(byId.B.leaving).toHaveLength(1);
    expect(byId.C.status).toBe("new");
    expect(byId.C.entering).toHaveLength(1);
  });

  it("movimento que muda de treino não conta como novo nem como perdido", () => {
    const next = plan([workout("A", [ex("push-up", "3 × 8")]), workout("B", [ex("plank", "3 × 20s")])]);
    const { totals } = diffPlans(current, next);
    expect(totals.newMovements).toBe(0);
    expect(totals.droppedMovements).toBe(1); // agachamento
  });

  it("plano com outro id é sinalizado", () => {
    expect(diffPlans(current, plan([workout("A", [ex("push-up", "3 × 8")])], "outro")).samePlan).toBe(
      false
    );
  });
});

describe("avisos", () => {
  const empty = plan([workout("A", [ex("push-up", "3 × 8")])]);
  const warn = (e: PlanExercise) =>
    diffPlans(empty, plan([workout("A", [e])])).warnings.map((w) => w.message);

  it("skill_ref com alvo em intervalo (parsed null) não avisa: o piso do texto vale", () => {
    const msgs = warn(ex("row-inverso-barra-baixa", "3 × 10-12", { skill_ref: { skill_id: "pull_up", level: 2 } }));
    expect(msgs).toEqual([]);
  });

  it("skill_ref sem número no alvo", () => {
    const msgs = warn(ex("row-inverso-barra-baixa", "até a falha", { skill_ref: { skill_id: "pull_up", level: 2 } }));
    expect(msgs.some((m) => m.includes("sem número no alvo"))).toBe(true);
  });

  it("alvo abaixo do critério do degrau (pull_up nível 2 pede 10 reps)", () => {
    const parsed = { sets: 3, target: 8, unit: "reps" as const, per_side: false };
    const msgs = warn(
      ex("row-inverso-barra-baixa", "3 × 8", { parsed, skill_ref: { skill_id: "pull_up", level: 2 } })
    );
    expect(msgs.some((m) => m.includes("abaixo do critério"))).toBe(true);

    const ok = warn(
      ex("row-inverso-barra-baixa", "3 × 10", {
        parsed: { ...parsed, target: 10 },
        skill_ref: { skill_id: "pull_up", level: 2 },
      })
    );
    expect(ok).toEqual([]);
  });

  it("descanso em minutos", () => {
    const msgs = warn(ex("push-up", "3 × 8", { rest: "descanso 2 min" }));
    expect(msgs.some((m) => m.includes("minutos"))).toBe(true);
    expect(warn(ex("push-up", "3 × 8", { rest: "descanso 120s" }))).toEqual([]);
  });

  it("alvo em prosa", () => {
    expect(warn(ex("push-up", "8-10 entradas")).some((m) => m.includes('"N × M"'))).toBe(true);
  });

  it("id novo pra movimento que já existe tem o histórico zerado", () => {
    const msgs = warn(ex("flexao-de-braco", "3 × 8", { name: "Push up" }));
    expect(msgs.some((m) => m.includes("recomeça do zero"))).toBe(true);
  });

  it("o mesmo problema em dois treinos avisa uma vez", () => {
    const bad = ex("push-up", "8-10 entradas");
    const diff = diffPlans(empty, plan([workout("A", [bad]), workout("B", [bad])]));
    expect(diff.warnings).toHaveLength(1);
  });
});
