import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getPreviousRepsVolume } from "@/lib/db/queries/previousWorkout";
import { countAt, easeOutCubic, progressAt } from "@/lib/domain/timeline";
import { plannedSetsCount } from "@/lib/domain/volume";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("linha do tempo do fim de treino", () => {
  it("progressAt vai de 0 a 1 dentro do trecho e trava nas pontas", () => {
    expect(progressAt(0, 100, 200)).toBe(0);
    expect(progressAt(200, 100, 200)).toBe(0.5);
    expect(progressAt(999, 100, 200)).toBe(1);
    expect(progressAt(100, 100, 0)).toBe(1);
  });

  it("countAt sai do valor inicial e assenta no final", () => {
    expect(countAt(0, 86, 300, 950)).toBe(0);
    expect(countAt(300 + 950, 86, 300, 950)).toBe(86);
    expect(countAt(5000, 5, 1500, 450, 4)).toBe(5);
    expect(countAt(1000, 5, 1500, 450, 4)).toBe(4);
  });

  it("sobe rápido no começo: na metade do tempo já passou da metade do valor", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(countAt(300 + 475, 100, 300, 950)).toBeGreaterThan(50);
    // nunca recua
    let last = -1;
    for (let t = 0; t <= 1400; t += 50) {
      const v = countAt(t, 86, 300, 950);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
  });
});

describe("séries do fim de treino", () => {
  it("conta só as planejadas: extras e pulados ficam de fora", () => {
    const parsed = null;
    const n = plannedSetsCount([
      { log: { as_target: false, sets: [{ index: 0, value: 4 }, { index: 1, value: 4 }], skipped: false, extra_sets: [3] }, parsed, target: "2 × 4" },
      { log: { as_target: true, sets: null, skipped: false, extra_sets: null }, parsed, target: "3 × 8" },
      { log: { as_target: false, sets: null, skipped: true, extra_sets: null }, parsed, target: "3 × 8" },
    ]);
    expect(n).toBe(5);
  });
});

describe("comparação com o último treino de mesma letra", () => {
  const logPullUp = (session_id: string, reps: number[]) =>
    upsertLog({
      session_id,
      exercise_id: "pull-up-negativa-lenta",
      as_target: false,
      sets: reps.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
      snapshot: { name: "Pull-up negativa lenta", target: "4 × 4", parsed: null },
    });

  it("devolve as reps da última sessão concluída do mesmo treino", async () => {
    const older = await createSession("A");
    await db.sessions.update(older.id, { started_at: 1000 });
    await logPullUp(older.id, [3, 3, 3]);
    await completeSession(older.id, 3, null);

    const prev = await createSession("A");
    await db.sessions.update(prev.id, { started_at: 2000 });
    await logPullUp(prev.id, [4, 4, 3, 3]);
    await completeSession(prev.id, 3, null);

    const other = await createSession("B");
    await db.sessions.update(other.id, { started_at: 2500 });
    await completeSession(other.id, 3, null);

    const now = await createSession("A");
    await db.sessions.update(now.id, { started_at: 3000 });
    await logPullUp(now.id, [5, 5, 5, 5]);

    expect(await getPreviousRepsVolume(now.id, "A")).toBe(14);
  });

  it("sem treino anterior, abandonado ou sem reps: null", async () => {
    const abandoned = await createSession("A");
    await db.sessions.update(abandoned.id, { started_at: 1000, status: "abandoned" });
    await logPullUp(abandoned.id, [4, 4]);

    const now = await createSession("A");
    await db.sessions.update(now.id, { started_at: 3000 });
    expect(await getPreviousRepsVolume(now.id, "A")).toBeNull();
    expect(await getPreviousRepsVolume(now.id, null)).toBeNull();
  });
});
