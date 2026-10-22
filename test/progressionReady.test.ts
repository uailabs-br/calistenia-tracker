import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";

const EX = "pull-up-negativa-lenta"; // parsed 4×4 reps, neg_flags ["caiu rápido"]

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function logSession(
  flags: string[],
  opts: { asTarget?: boolean; sets?: number[] } = {}
) {
  const s = await createSession("A");
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
    await logSession(["5s mantido"]); // flag positiva não conta como suja
    expect(await getProgressionReady(EX)).toBe(true);
  });

  it("2 no alvo mas 1 com flag negativa → não pronto", async () => {
    await logSession([]);
    await logSession(["caiu rápido"]);
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

describe("alvo em intervalo (parsed null)", () => {
  // O prompt manda parsed null em todo intervalo: antes o alvo virava null e
  // nenhum registro ajustado contava, só o "fiz como previsto".
  async function logRange(values: number[]) {
    const s = await createSession("A");
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      snapshot: { name: "Negativa", target: "3 × 6-8", parsed: null },
      as_target: false,
      sets: values.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
    });
    await completeSession(s.id, 3, null);
  }

  it("séries ajustadas dentro do piso do texto → pronto", async () => {
    await logRange([8, 7, 6]);
    await logRange([8, 8, 8]);
    expect(await getProgressionReady(EX)).toBe(true);
  });

  it("série abaixo do piso → não pronto", async () => {
    await logRange([8, 8, 8]);
    await logRange([8, 8, 5]);
    expect(await getProgressionReady(EX)).toBe(false);
  });
});
