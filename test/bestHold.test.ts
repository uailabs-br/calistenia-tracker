import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getBestHold } from "@/lib/db/queries/metrics";

const HOLD = "mu-false-grip-hang"; // isometria (seconds)

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function record(values: number[]) {
  const s = await createSession(1);
  await upsertLog({
    session_id: s.id,
    exercise_id: HOLD,
    as_target: false,
    sets: values.map((value, index) => ({ index, value })),
    flags_selected: [],
    skipped: false,
  });
  await completeSession(s.id, 3, null);
}

describe("getBestHold", () => {
  it("usa o maior hold único da sessão, não a soma", async () => {
    await record([8, 10, 6]);
    const points = await getBestHold(HOLD);
    expect(points.map((p) => p.volume)).toEqual([10]);
  });

  it("acompanha a progressão do melhor hold entre sessões", async () => {
    await record([8]);
    await record([12]);
    await record([18]);
    const points = await getBestHold(HOLD);
    expect(points.map((p) => p.volume)).toEqual([8, 12, 18]);
  });
});
