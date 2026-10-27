import { describe, it, expect, beforeEach } from "vitest";
import { db, type Session } from "@/lib/db/schema";
import {
  getWeekReview,
  getWeekHistory,
} from "@/lib/db/queries/weekReview";
import { upsertLog } from "@/lib/db/repositories/logs";
import { closingIndexes } from "@/lib/domain/campaign";
import { localDateKey, shiftDays, weekStartKey } from "@/lib/utils/date";

// Semanas relativas a hoje (a query revisa sempre a semana anterior à corrente)
const lastMonday = shiftDays(weekStartKey(localDateKey()), -7);
const prevMonday = shiftDays(lastMonday, -7);

function session(date: string, rpe: number | null = 3): Session {
  return {
    id: crypto.randomUUID(),
    plan_day_id: "p:A",
    plan_version: 1,
    workout_id: "A",
    date,
    status: "completed",
    // a data manda na ordem: com todos no mesmo instante o desempate é o uuid
    started_at: new Date(`${date}T12:00:00`).getTime(),
    ended_at: new Date(`${date}T13:00:00`).getTime(),
    rpe,
    note: null,
    source: "plan",
    updated_at: Date.now(),
    deleted_at: null,
  };
}

async function addLog(sessionId: string, value: number, skipped = false, exerciseId = "mu-puxada-explosiva") {
  await db.exerciseLogs.add({
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: exerciseId,
    as_target: false,
    sets: [{ index: 0, value }],
    flags_selected: [],
    note: null,
    skipped,
    logged_at: Date.now(),
    updated_at: Date.now(),
    deleted_at: null,
    skill_id: null,
    level_at_time: null,
    criteria_type: null,
    sets_performed: null,
    criterion_met: null,
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
    expect(r!.sessionsDone).toBe(2);
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
    expect(r!.sessionsDone).toBe(1);
  });

  it("sessões sem rpe → avgRpe null", async () => {
    await db.sessions.add(session(lastMonday, null));
    const r = await getWeekReview();
    expect(r!.avgRpe).toBeNull();
  });

  it("revisa uma semana arbitrária pelo argumento monday", async () => {
    const s = session(prevMonday);
    await db.sessions.add(s);
    await addLog(s.id, 10);
    const r = await getWeekReview(prevMonday);
    expect(r!.weekStart).toBe(prevMonday);
    expect(r!.sessionsDone).toBe(1);
  });
});

describe("getWeekHistory", () => {
  it("lista semanas passadas com treino, da mais recente à mais antiga", async () => {
    const a = session(prevMonday);
    const b = session(lastMonday);
    await db.sessions.bulkAdd([a, b]);
    await addLog(a.id, 8);
    await addLog(b.id, 10);
    // sessão desta semana não deve entrar
    await db.sessions.add(session(localDateKey()));

    const history = await getWeekHistory();
    expect(history.map((r) => r.weekStart)).toEqual([lastMonday, prevMonday]);
  });
});

describe("getWeekReview — o que a tela da semana mostra", () => {
  it("dias de seg a dom com o rótulo do treino, e meta igual à da constância", async () => {
    const mon = session(lastMonday);
    const wed = session(shiftDays(lastMonday, 2));
    await db.sessions.bulkAdd([mon, wed]);
    const r = await getWeekReview();
    expect(r!.days).toEqual(["A", null, "A", null, null, null, null]);
    // sem meta no perfil (teste roda sem localStorage): o nº de treinos do plano
    expect(r!.goal).toBe(r!.planTotal);
  });

  it("recorde da semana parte do melhor de antes dela", async () => {
    const prev = session(prevMonday);
    const a = session(lastMonday);
    const b = session(shiftDays(lastMonday, 2));
    await db.sessions.bulkAdd([prev, a, b]);
    // recorde precisa de unidade: o exercício tem de estar no plano (treino A)
    await addLog(prev.id, 4, false, "pull-up-negativa-lenta");
    await addLog(a.id, 5, false, "pull-up-negativa-lenta");
    await addLog(b.id, 6, false, "pull-up-negativa-lenta");
    const r = await getWeekReview();
    expect(r!.records).toHaveLength(1);
    expect(r!.records[0]).toMatchObject({ value: 6, previous: 4 });
  });

  it("pulados agrupados por exercício", async () => {
    const a = session(lastMonday);
    const b = session(shiftDays(lastMonday, 1));
    await db.sessions.bulkAdd([a, b]);
    await addLog(a.id, 0, true);
    await addLog(b.id, 0, true);
    const r = await getWeekReview();
    expect(r!.skipped).toHaveLength(1);
    expect(r!.skipped[0].count).toBe(2);
  });

  it("nível que fechou na semana: a 2ª sessão no critério caiu nela", async () => {
    const a = session(lastMonday);
    const b = session(shiftDays(lastMonday, 3));
    await db.sessions.bulkAdd([a, b]);
    for (const s of [a, b]) {
      await upsertLog({
        session_id: s.id,
        exercise_id: "mu-completo",
        as_target: false,
        sets: [3, 3, 3].map((value, index) => ({ index, value })),
        flags_selected: [],
        skipped: false,
        sets_performed: { type: "reps_rir", reps: [3, 3, 3], rir: null, form_ok: true },
      });
    }
    const r = await getWeekReview();
    expect(r!.levelsClosed).toEqual([
      expect.objectContaining({ skillId: "muscle_up", level: 5 }),
    ]);
  });
});

describe("closingIndexes", () => {
  const met = { met: true, realFailure: false };
  const miss = { met: false, realFailure: true };
  const neutral = { met: false, realFailure: false, neutral: true };

  it("marca a sessão em que a sequência chega ao exigido; neutro não quebra", () => {
    expect(closingIndexes([met, neutral, met], 2)).toEqual([2]);
    expect(closingIndexes([met, miss, met, met], 2)).toEqual([3]);
    expect(closingIndexes([met, met, met], 2)).toEqual([1]);
    expect(closingIndexes([met], 2)).toEqual([]);
  });
});
