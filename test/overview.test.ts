import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  createFreeformSession,
  getLastPlanWorkoutId,
} from "@/lib/db/repositories/sessions";
import { getOverview, getWeekStatus, getActivityHeatmap } from "@/lib/db/queries/metrics";
import { daysBetween, localDateKey, weekStartKey, shiftDays } from "@/lib/utils/date";
import { plan } from "@/lib/plan/loader";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

/** Cria e conclui um treino do plano numa data. */
async function doneOn(workoutId: string, date: string) {
  const s = await createSession(workoutId);
  await db.sessions.update(s.id, { date });
  await completeSession(s.id, 3, null);
  return s;
}

describe("equilíbrio entre treinos", () => {
  it("conta quantas vezes cada treino do plano foi concluído", async () => {
    await doneOn("A", "2026-07-06");
    await doneOn("A", "2026-07-08");
    await doneOn("C", "2026-07-10");

    const { balanceByWorkout } = await getOverview();
    const byId = Object.fromEntries(balanceByWorkout.map((b) => [b.id, b]));
    expect(byId.A.count).toBe(2);
    expect(byId.B.count).toBe(0);
    expect(byId.C.count).toBe(1);
    // frequência = treinos / semanas desde a 1ª sessão (2026-07-06)
    const weeks = Math.max(1, Math.ceil((daysBetween("2026-07-06", localDateKey()) + 1) / 7));
    expect(byId.A.pct).toBe(Math.min(100, Math.round((2 / weeks) * 100)));
    expect(byId.C.pct).toBe(Math.min(100, Math.round((1 / weeks) * 100)));
    expect(byId.B.pct).toBe(0);
  });

  it("última data é a do treino mais recente", async () => {
    await doneOn("A", "2026-07-06");
    await doneOn("A", "2026-07-08");

    const { balanceByWorkout } = await getOverview();
    expect(balanceByWorkout.find((b) => b.id === "A")?.lastDate).toBe("2026-07-08");
    expect(balanceByWorkout.find((b) => b.id === "B")?.lastDate).toBeNull();
  });

  it("treino avulso não entra no equilíbrio", async () => {
    const f = await createFreeformSession(20);
    await db.sessions.update(f.id, { date: "2026-07-06" });

    const { balanceByWorkout } = await getOverview();
    expect(balanceByWorkout.every((b) => b.count === 0)).toBe(true);
  });
});

describe("calendário de constância", () => {
  it("12 semanas Seg→Dom, a última contém hoje", async () => {
    const weeks = await getActivityHeatmap(12);
    expect(weeks).toHaveLength(12);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].date).toBe(shiftDays(weekStartKey(localDateKey()), -7 * 11));
    const today = weeks.flat().find((d) => d.isToday);
    expect(today?.date).toBe(localDateKey());
  });

  it("conta treinos concluídos no dia certo", async () => {
    const today = localDateKey();
    await doneOn("A", today);
    await doneOn("B", today);
    await doneOn("C", shiftDays(today, -1));
    const days = (await getActivityHeatmap(12)).flat();
    expect(days.find((d) => d.date === today)?.count).toBe(2);
    expect(days.find((d) => d.date === shiftDays(today, -1))?.count).toBe(1);
  });

  it("dias futuros não contam como treino", async () => {
    const weeks = await getActivityHeatmap(12);
    const future = weeks.flat().filter((d) => d.future);
    expect(future.every((d) => d.count === 0)).toBe(true);
  });
});

describe("sequência de treino", () => {
  it("último treino do plano define o próximo", async () => {
    await doneOn("A", "2026-07-06");
    await doneOn("B", "2026-07-08");
    expect(await getLastPlanWorkoutId()).toBe("B");
  });

  it("avulso não conta como último treino do plano", async () => {
    await doneOn("A", "2026-07-06");
    const f = await createFreeformSession(20);
    await db.sessions.update(f.id, { date: "2026-07-08" });
    expect(await getLastPlanWorkoutId()).toBe("A");
  });

  it("sessão em andamento não conta", async () => {
    await doneOn("A", "2026-07-06");
    await createSession("B");
    expect(await getLastPlanWorkoutId()).toBe("A");
  });

  it("nunca treinou → null", async () => {
    expect(await getLastPlanWorkoutId()).toBeNull();
  });
});

describe("meta semanal por quantidade de treinos", () => {
  it("dois treinos no mesmo dia contam como 2", async () => {
    const monday = weekStartKey(localDateKey());
    await doneOn("A", monday);
    await doneOn("B", monday);
    const week = await getWeekStatus();
    expect(week.done).toBe(2);
  });

  it("planTotal é o nº de treinos do plano", async () => {
    const week = await getWeekStatus();
    expect(week.planTotal).toBe(plan.workouts.length);
  });

  it("treino avulso conta pro total, mas fica separado em freeformCount", async () => {
    const monday = weekStartKey(localDateKey());
    await doneOn("A", monday);

    const freeform = await createFreeformSession(20);
    await db.sessions.update(freeform.id, { date: shiftDays(monday, 1) });

    const week = await getWeekStatus();
    expect(week.done).toBe(2);
    expect(week.freeformCount).toBe(1);
    expect(week.days.find((d) => d.weekday === 2)?.source).toBe("freeform");
    expect(week.days.find((d) => d.weekday === 1)?.source).toBe("plan");
  });

  it("no mesmo dia, plano tem prioridade na faixa, mas os dois contam no total", async () => {
    const monday = weekStartKey(localDateKey());
    await doneOn("A", monday);

    const freeform = await createFreeformSession(10);
    await db.sessions.update(freeform.id, { date: monday });

    const week = await getWeekStatus();
    expect(week.done).toBe(2);
    expect(week.freeformCount).toBe(1);
    expect(week.days.find((d) => d.weekday === 1)?.source).toBe("plan");
  });
});
