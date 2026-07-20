import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { computePR } from "@/lib/db/queries/pr";
import type { Parsed } from "@/lib/plan/schema";

const HOLD = "mu-false-grip-hang"; // parsed seconds, neg_flags ["pulso escorregou"]
const secs: Parsed = { sets: 2, target: 20, unit: "seconds", per_side: false };

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function record(values: number[], flags: string[] = []) {
  const s = await createSession(1);
  await upsertLog({
    session_id: s.id,
    exercise_id: HOLD,
    as_target: false,
    sets: values.map((value, index) => ({ index, value })),
    flags_selected: flags,
    skipped: false,
  });
  await completeSession(s.id, 3, null);
}

const clean = { as_target: false, skipped: false, flags_selected: [] as string[] };

describe("computePR", () => {
  it("1ª vez não é recorde", async () => {
    const pr = await computePR(
      HOLD,
      { ...clean, sets: [{ index: 0, value: 25 }] },
      secs
    );
    expect(pr).toBeNull();
  });

  it("supera o melhor hold histórico → recorde", async () => {
    await record([18, 20]); // melhor anterior = 20
    const pr = await computePR(
      HOLD,
      { ...clean, sets: [{ index: 0, value: 22 }] },
      secs
    );
    expect(pr).toEqual({ value: 22, unit: "seconds" });
  });

  it("empate não é recorde", async () => {
    await record([20]);
    const pr = await computePR(
      HOLD,
      { ...clean, sets: [{ index: 0, value: 20 }] },
      secs
    );
    expect(pr).toBeNull();
  });

  it("flag negativa no log atual → sem PR", async () => {
    await record([20]);
    const pr = await computePR(
      HOLD,
      { as_target: false, skipped: false, flags_selected: ["pulso escorregou"], sets: [{ index: 0, value: 30 }] },
      secs
    );
    expect(pr).toBeNull();
  });

  it("histórico sujo não vira o recorde a bater", async () => {
    await record([30], ["pulso escorregou"]); // sujo: ignorado
    await record([18]); // melhor limpo = 18
    const pr = await computePR(
      HOLD,
      { ...clean, sets: [{ index: 0, value: 20 }] },
      secs
    );
    expect(pr).toEqual({ value: 20, unit: "seconds" });
  });

  it("attempts / sem parsed não têm PR", async () => {
    expect(await computePR("x", { ...clean, sets: [{ index: 0, value: 5 }] }, null)).toBeNull();
  });
});
