import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { computePR, getLatestRecord } from "@/lib/db/queries/pr";
import type { Parsed } from "@/lib/plan/schema";

const HOLD = "fl-single-leg-hold"; // parsed seconds, neg_flags ["quadril caiu","perna dobrou"]
const secs: Parsed = { sets: 2, target: 20, unit: "seconds", per_side: false };

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function record(values: number[], flags: string[] = []) {
  const s = await createSession("A");
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
    expect(pr).toEqual({ value: 22, unit: "seconds", previous: 20 });
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
      { as_target: false, skipped: false, flags_selected: ["quadril caiu"], sets: [{ index: 0, value: 30 }] },
      secs
    );
    expect(pr).toBeNull();
  });

  it("histórico sujo não vira o recorde a bater", async () => {
    await record([30], ["quadril caiu"]); // sujo: ignorado
    await record([18]); // melhor limpo = 18
    const pr = await computePR(
      HOLD,
      { ...clean, sets: [{ index: 0, value: 20 }] },
      secs
    );
    expect(pr).toEqual({ value: 20, unit: "seconds", previous: 18 });
  });

  it("attempts / sem parsed não têm PR", async () => {
    expect(await computePR("x", { ...clean, sets: [{ index: 0, value: 5 }] }, null)).toBeNull();
  });
});

describe("getLatestRecord", () => {
  // started_at define a ordem do histórico: um treino por "dia" pra não empatar
  let day = 0;
  beforeEach(() => {
    day = 0;
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());
  const at = async (values: number[], flags: string[] = []) => {
    vi.setSystemTime(new Date(2026, 9, 1 + day++, 18));
    await record(values, flags);
  };

  it("sem histórico ou só 1ª vez → null", async () => {
    expect(await getLatestRecord()).toBeNull();
    await at([20]);
    expect(await getLatestRecord()).toBeNull();
  });

  it("o mais recente que superou o melhor de antes, com o valor anterior", async () => {
    await at([20]);
    await at([22]); // recorde 20 → 22
    await at([21]); // abaixo
    await at([25]); // recorde 22 → 25
    await at([24]);
    expect(await getLatestRecord()).toMatchObject({
      exerciseId: HOLD,
      value: 25,
      previous: 22,
      unit: "seconds",
      date: "2026-10-04",
    });
  });

  it("série suja não é recorde nem vira a base", async () => {
    await at([20]);
    await at([30], ["quadril caiu"]);
    await at([22]);
    expect(await getLatestRecord()).toMatchObject({ value: 22, previous: 20 });
  });
});
