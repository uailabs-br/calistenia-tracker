import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";

const EX = "mu-puxada-explosiva"; // parsed 4×4 reps, neg_flags ["parou no queixo","kip apareceu"]

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function logSession(
  flags: string[],
  opts: { asTarget?: boolean; sets?: number[] } = {}
) {
  const s = await createSession(1);
  await upsertLog({
    session_id: s.id,
    exercise_id: EX,
    as_target: opts.asTarget ?? true,
    sets: opts.sets ? opts.sets.map((value, index) => ({ index, value })) : null,
    flags_selected: flags,
    skipped: false,
  });
  await completeSession(s.id, 3, null);
}

describe("getProgressionReady", () => {
  it("2 sessões no alvo e limpas → pronto", async () => {
    await logSession([]);
    await logSession(["chegou no esterno"]); // flag positiva não conta como suja
    expect(await getProgressionReady(EX)).toBe(true);
  });

  it("2 no alvo mas 1 com flag negativa → não pronto", async () => {
    await logSession([]);
    await logSession(["kip apareceu"]);
    expect(await getProgressionReady(EX)).toBe(false);
  });

  it("1 sessão só → não pronto", async () => {
    await logSession([]);
    expect(await getProgressionReady(EX)).toBe(false);
  });

  it("1 série abaixo do alvo → não pronto", async () => {
    await logSession([], { asTarget: false, sets: [4, 4, 4, 4] });
    await logSession([], { asTarget: false, sets: [4, 4, 3, 4] }); // 3 < target 4
    expect(await getProgressionReady(EX)).toBe(false);
  });
});
