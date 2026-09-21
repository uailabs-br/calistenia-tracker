import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  abandonSession,
  discardSession,
} from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getRecentExerciseIds } from "@/lib/db/queries/recentExercises";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

const tick = () => new Promise((r) => setTimeout(r, 3));

async function log(sessionId: string, exerciseId: string, skipped = false) {
  await tick();
  await upsertLog({
    session_id: sessionId,
    exercise_id: exerciseId,
    as_target: true,
    sets: null,
    flags_selected: [],
    skipped,
  });
}

describe("getRecentExerciseIds", () => {
  it("mais recente primeiro, sem repetir", async () => {
    const a = await createSession(1);
    await log(a.id, "plank");
    await log(a.id, "chin-up");
    await completeSession(a.id, 3, null);
    const b = await createSession(2);
    await log(b.id, "plank"); // repete: sobe pro topo
    await completeSession(b.id, 3, null);
    expect(await getRecentExerciseIds()).toEqual(["plank", "chin-up"]);
  });

  it("ignora pulados", async () => {
    const a = await createSession(1);
    await log(a.id, "plank", true);
    await log(a.id, "chin-up");
    expect(await getRecentExerciseIds()).toEqual(["chin-up"]);
  });

  it("ignora sessão descartada e abandonada", async () => {
    const a = await createSession(1);
    await log(a.id, "plank");
    await discardSession(a.id);
    const b = await createSession(1);
    await log(b.id, "chin-up");
    await abandonSession(b.id);
    const c = await createSession(1);
    await log(c.id, "dip-paralelas");
    expect(await getRecentExerciseIds()).toEqual(["dip-paralelas"]);
  });

  it("respeita o limite", async () => {
    const a = await createSession(1);
    for (const id of ["a", "b", "c", "d"]) await log(a.id, id);
    expect(await getRecentExerciseIds(2)).toEqual(["d", "c"]);
  });

  it("sem histórico → vazio", async () => {
    expect(await getRecentExerciseIds()).toEqual([]);
  });
});
