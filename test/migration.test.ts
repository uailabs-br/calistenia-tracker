import { describe, it, expect } from "vitest";
import Dexie from "dexie";

/**
 * Migração v4 → v5 (weekday → workout_id). Cria o banco no formato antigo,
 * com sessões de vários tipos, e abre o TrackerDB atual para disparar o upgrade.
 */
describe("Dexie v4 → v5", () => {
  it("converte weekday em workout_id e preserva o resto", async () => {
    const old = new Dexie("calistenia-tracker");
    old.version(4).stores({
      sessions: "id, plan_day_id, date, status, weekday, source, updated_at, deleted_at",
      exerciseLogs: "id, session_id, exercise_id, skill_id, updated_at, deleted_at",
      customExercises: "id, name, updated_at, deleted_at",
    });
    await old.open();

    const base = {
      plan_version: 1,
      status: "completed",
      started_at: 1,
      ended_at: 2,
      rpe: 3,
      note: null,
      added_exercises: null,
      updated_at: 2,
      deleted_at: null,
    };
    await old.table("sessions").bulkAdd([
      { ...base, id: "s-seg", plan_day_id: "plan-x:1", weekday: 1, date: "2026-07-06", source: "plan" },
      { ...base, id: "s-qua", plan_day_id: "plan-x:3", weekday: 3, date: "2026-07-08", source: "plan" },
      // treinou terça-feira do plano numa quarta: o template é o que conta
      { ...base, id: "s-fora", plan_day_id: "plan-x:9", weekday: 9, date: "2026-07-09", source: "plan" },
      { ...base, id: "s-avulso", plan_day_id: null, weekday: 5, date: "2026-07-10", source: "freeform" },
    ]);
    old.close();

    const { db } = await import("@/lib/db/schema");
    await db.open();

    const byId = Object.fromEntries((await db.sessions.toArray()).map((s) => [s.id, s]));

    expect(byId["s-seg"].workout_id).toBe("A");
    expect(byId["s-seg"].plan_day_id).toBe("plan-x:A");
    expect(byId["s-qua"].workout_id).toBe("C");
    expect(byId["s-qua"].plan_day_id).toBe("plan-x:C");
    // weekday fora do padrão: guarda marca legível, não some nem vira outro treino
    expect(byId["s-fora"].workout_id).toBe("legacy-9");
    // avulso não tem treino
    expect(byId["s-avulso"].workout_id).toBeNull();
    expect(byId["s-avulso"].plan_day_id).toBeNull();

    for (const s of Object.values(byId)) {
      expect(s).not.toHaveProperty("weekday");
    }
    expect(byId["s-seg"].rpe).toBe(3);
    expect(byId["s-seg"].date).toBe("2026-07-06");

    db.close();
  });
});
