import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  createFreeformSession,
} from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus } from "@/lib/db/queries/metrics";
import { localDateKey, weekStartKey, shiftDays } from "@/lib/utils/date";

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

  it("treino avulso conta pro total, mas fica separado em freeformCount", async () => {
    const monday = weekStartKey(localDateKey());
    // 1 dia de plano (segunda) + 1 dia avulso (terça) na semana corrente.
    const s = await createSession(1);
    await db.sessions.update(s.id, { date: monday });
    await completeSession(s.id, 3, null);

    const freeform = await createFreeformSession(20);
    await db.sessions.update(freeform.id, { date: shiftDays(monday, 1), weekday: 2 });

    const week = await getWeekStatus();
    expect(week.done).toBe(2);
    expect(week.freeformCount).toBe(1);
    const tue = week.days.find((d) => d.weekday === 2);
    expect(tue?.source).toBe("freeform");
    const mon = week.days.find((d) => d.weekday === 1);
    expect(mon?.source).toBe("plan");
  });

  it("sessão de plano tem prioridade sobre avulsa no mesmo dia", async () => {
    const monday = weekStartKey(localDateKey());
    const s = await createSession(1);
    await db.sessions.update(s.id, { date: monday });
    await completeSession(s.id, 3, null);

    const freeform = await createFreeformSession(10);
    await db.sessions.update(freeform.id, { date: monday, weekday: 1 });

    const week = await getWeekStatus();
    expect(week.done).toBe(1);
    expect(week.freeformCount).toBe(0);
    const mon = week.days.find((d) => d.weekday === 1);
    expect(mon?.source).toBe("plan");
  });
});
