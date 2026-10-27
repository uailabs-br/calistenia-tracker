import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getLastWorkoutRun } from "@/lib/db/queries/previousWorkout";
import { focusLabel, workoutFocus } from "@/lib/domain/workoutFocus";
import { focusEntries } from "@/lib/plan/focus";
import { relativeDay } from "@/lib/utils/date";
import type { Workout } from "@/lib/plan/schema";
import personal from "@/lib/plan/plans/pessoal-mu-hs-fl.json";

const focusOf = (w: Workout) => {
  const f = workoutFocus(focusEntries(w));
  return f && focusLabel(f);
};

describe("foco do treino", () => {
  it("conta por série e corta o que tem menos de 1/4", () => {
    expect(
      workoutFocus([
        { category: "Puxar", sets: 10 },
        { category: "Empurrar", sets: 3 },
        { category: "Pernas", sets: 3 },
      ])
    ).toEqual(["Puxar"]);
    expect(
      workoutFocus([
        { category: "Core", sets: 6 },
        { category: "Empurrar", sets: 5 },
        { category: "Puxar", sets: 3 },
      ])
    ).toEqual(["Core", "Empurrar"]);
  });

  it("some quando menos da metade das séries tem categoria", () => {
    expect(
      workoutFocus([
        { category: "Puxar", sets: 3 },
        { category: null, sets: 4 },
      ])
    ).toBeNull();
    expect(
      workoutFocus([
        { category: "Puxar", sets: 4 },
        { category: null, sets: 4 },
      ])
    ).toEqual(["Puxar"]);
    expect(workoutFocus([])).toBeNull();
  });

  it("texto: primeira em maiúscula, o resto ligado por vírgula e 'e'", () => {
    expect(focusLabel(["Puxar"])).toBe("Puxar");
    expect(focusLabel(["Puxar", "Empurrar"])).toBe("Puxar e empurrar");
    expect(focusLabel(["Core", "Empurrar", "Puxar"])).toBe("Core, empurrar e puxar");
  });

  it("no plano pessoal, sai do catálogo", () => {
    const [a, b, , , e] = (personal as { workouts: Workout[] }).workouts;
    expect(focusOf(a)).toBe("Puxar");
    expect(focusOf(b)).toBe("Puxar e empurrar");
    expect(focusOf(e)).toBe("Core e empurrar");
  });

  it("exercício fora do catálogo usa a skill do treino", () => {
    const w = {
      id: "X",
      label: "X",
      title: "Teste",
      skill: "Muscle Up",
      blocks: [
        {
          label: "Skill",
          exercises: [{ id: "inventado-pela-ia", name: "?", target: "3 × 5", parsed: { sets: 3, target: 5, unit: "reps", per_side: false } }],
        },
      ],
    } as unknown as Workout;
    expect(focusOf(w)).toBe("Puxar");
  });
});

describe("quando foi", () => {
  it("hoje, ontem, dia da semana até 6 dias, depois só os dias", () => {
    expect(relativeDay("2026-10-27", "2026-10-27")).toBe("hoje");
    expect(relativeDay("2026-10-26", "2026-10-27")).toBe("ontem");
    expect(relativeDay("2026-10-22", "2026-10-27")).toBe("quinta, há 5 dias");
    expect(relativeDay("2026-10-15", "2026-10-27")).toBe("há 12 dias");
  });
});

describe("última vez do treino", () => {
  beforeEach(async () => {
    await db.sessions.clear();
    await db.exerciseLogs.clear();
  });

  it("pega a última concluída da mesma letra, com duração, reps e esforço", async () => {
    const older = await createSession("A");
    await db.sessions.update(older.id, { started_at: 1000 });
    await completeSession(older.id, 2, null);

    const last = await createSession("A");
    await upsertLog({
      session_id: last.id,
      exercise_id: "pull-up-negativa-lenta",
      as_target: false,
      sets: [4, 4, 3].map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
      snapshot: { name: "Pull-up negativa lenta", target: "3 × 4", parsed: null },
    });
    await completeSession(last.id, 4, null);
    await db.sessions.update(last.id, { started_at: 5000, ended_at: 5000 + 48 * 60_000 });

    const inProgress = await createSession("A");
    await db.sessions.update(inProgress.id, { started_at: 9000 });

    const run = await getLastWorkoutRun("A");
    expect(run).toMatchObject({ minutes: 48, reps: 11, rpe: 4, date: last.date });
  });

  it("primeira vez: null", async () => {
    await createSession("A");
    expect(await getLastWorkoutRun("A")).toBeNull();
  });
});
