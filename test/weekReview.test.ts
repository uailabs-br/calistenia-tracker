import { describe, it, expect, beforeEach } from "vitest";
import { db, type Session } from "@/lib/db/schema";
import {
  getWeekReview,
  buildWeekReviewTexts,
  type WeekReview,
} from "@/lib/db/queries/weekReview";
import { localDateKey, shiftDays, weekStartKey } from "@/lib/utils/date";

// Semanas relativas a hoje (a query revisa sempre a semana anterior à corrente)
const lastMonday = shiftDays(weekStartKey(localDateKey()), -7);
const prevMonday = shiftDays(lastMonday, -7);

function session(date: string, rpe: number | null = 3): Session {
  return {
    id: crypto.randomUUID(),
    plan_day_id: "p:1",
    plan_version: 1,
    weekday: new Date(date + "T00:00:00").getDay(),
    date,
    status: "completed",
    started_at: Date.now(),
    ended_at: Date.now(),
    rpe,
    note: null,
    updated_at: Date.now(),
    deleted_at: null,
  };
}

async function addLog(sessionId: string, value: number) {
  await db.exerciseLogs.add({
    id: crypto.randomUUID(),
    session_id: sessionId,
    // exercício da segunda-feira do plano (weekday 1)
    exercise_id: "mu-puxada-explosiva",
    as_target: false,
    sets: [{ index: 0, value }],
    flags_selected: [],
    note: null,
    skipped: false,
    logged_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
  });
}

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("getWeekReview", () => {
  it("sem treino na última semana → null", async () => {
    // treino só nesta semana não conta
    await db.sessions.add(session(localDateKey()));
    expect(await getWeekReview()).toBeNull();
  });

  it("resume a última semana: dias distintos, rpe médio e delta de volume", async () => {
    const prev = session(prevMonday, 2);
    const last1 = session(lastMonday, 3);
    const last2 = session(shiftDays(lastMonday, 2), 4);
    await db.sessions.bulkAdd([prev, last1, last2]);
    await addLog(prev.id, 10);
    await addLog(last1.id, 12);

    const r = await getWeekReview();
    expect(r).not.toBeNull();
    expect(r!.weekStart).toBe(lastMonday);
    expect(r!.weekEnd).toBe(shiftDays(lastMonday, 6));
    expect(r!.daysDone).toBe(2);
    expect(r!.avgRpe).toBe(3.5);
    // 12 vs 10 → +20% (per_side multiplica os dois lados igualmente)
    expect(r!.volumeDeltaPct).toBe(20);
  });

  it("sem semana anterior para comparar → delta null", async () => {
    const s = session(lastMonday);
    await db.sessions.add(s);
    await addLog(s.id, 10);
    const r = await getWeekReview();
    expect(r!.volumeDeltaPct).toBeNull();
    expect(r!.volume).toBeGreaterThan(0);
  });

  it("ignora sessões desta semana, deletadas e não concluídas", async () => {
    const valid = session(lastMonday);
    const deleted = { ...session(shiftDays(lastMonday, 1)), deleted_at: Date.now() };
    const inProgress = {
      ...session(shiftDays(lastMonday, 2)),
      status: "in_progress" as const,
    };
    const thisWeek = session(localDateKey());
    await db.sessions.bulkAdd([valid, deleted, inProgress, thisWeek]);

    const r = await getWeekReview();
    expect(r!.daysDone).toBe(1);
  });

  it("sessões sem rpe → avgRpe null", async () => {
    await db.sessions.add(session(lastMonday, null));
    const r = await getWeekReview();
    expect(r!.avgRpe).toBeNull();
  });
});

describe("buildWeekReviewTexts", () => {
  const base: WeekReview = {
    weekStart: "2026-07-06",
    weekEnd: "2026-07-12",
    daysDone: 5,
    planTotal: 5,
    volume: 100,
    volumeDeltaPct: 10,
    avgRpe: 3,
    skippedCount: 0,
  };

  it("semana completa → destaca a completude, sem 'a melhorar'", () => {
    const t = buildWeekReviewTexts(base);
    expect(t.good).toContain("Semana completa");
    expect(t.improve).toBeNull();
  });

  it("semana parcial com volume subindo → good de volume, improve de treinos", () => {
    const t = buildWeekReviewTexts({ ...base, daysDone: 3, volumeDeltaPct: 15 });
    expect(t.good).toContain("15%");
    expect(t.improve).toContain("2 treinos");
  });

  it("semana completa com volume caindo → improve aponta o volume", () => {
    const t = buildWeekReviewTexts({ ...base, volumeDeltaPct: -8 });
    expect(t.improve).toContain("8% abaixo");
  });

  it("frase é determinística para a mesma semana", () => {
    const a = buildWeekReviewTexts(base).phrase;
    const b = buildWeekReviewTexts(base).phrase;
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });
});
