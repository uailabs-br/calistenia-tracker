import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus } from "@/lib/db/queries/metrics";
import { localDateKey, weekStartKey } from "@/lib/utils/date";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("aderência por dia executado", () => {
  it("treino do plano de terça feito numa segunda credita a segunda", async () => {
    // 2026-07-13 é uma segunda-feira. Sessão do dia de plano weekday=2 (terça),
    // porém executada nessa segunda → crédito vai para a barra de segunda.
    const s = await createSession(2);
    await db.sessions.update(s.id, { date: "2026-07-13" });
    await completeSession(s.id, 3, null);

    const { adherenceByWeekday } = await getOverview();
    const seg = adherenceByWeekday.find((d) => d.weekday === 1);
    const ter = adherenceByWeekday.find((d) => d.weekday === 2);
    expect(seg?.pct).toBeGreaterThan(0);
    expect(ter?.pct ?? 0).toBe(0);
    expect(seg?.pct).toBeLessThanOrEqual(100);
  });
});

describe("getWeekStatus", () => {
  it("dois treinos no mesmo dia contam como 1 dia feito", async () => {
    const monday = weekStartKey(localDateKey()); // segunda da semana corrente
    for (let i = 0; i < 2; i++) {
      const s = await createSession(1);
      await db.sessions.update(s.id, { date: monday });
      await completeSession(s.id, 3, null);
    }
    const week = await getWeekStatus();
    expect(week.done).toBe(1);
  });
});
