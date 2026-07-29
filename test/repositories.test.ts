import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  createFreeformSession,
  getActiveSession,
  completeSession,
  softDeleteSession,
} from "@/lib/db/repositories/sessions";
import { upsertLog, getLogsForSession, removeLog } from "@/lib/db/repositories/logs";
import { getLastPerformance } from "@/lib/db/queries/lastPerformance";
import { exportAll, importMerge } from "@/lib/db/backup";
import { planDayId } from "@/lib/plan/loader";
import { localDateKey, shiftDays } from "@/lib/utils/date";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("sessions repository", () => {
  it("cria sessão in_progress com UUID, updated_at e tombstone nulo", async () => {
    const s = await createSession(1);
    expect(s.id).toMatch(/[0-9a-f-]{36}/);
    expect(s.status).toBe("in_progress");
    expect(s.updated_at).toBeGreaterThan(0);
    expect(s.deleted_at).toBeNull();
    expect(s.plan_day_id).toBe(planDayId(1));
  });

  it("getActiveSession retorna a in_progress mais recente", async () => {
    await createSession(1);
    const active = await getActiveSession();
    expect(active?.status).toBe("in_progress");
  });

  it("completeSession grava rpe e ended_at", async () => {
    const s = await createSession(1);
    await completeSession(s.id, 4, "  boa  ");
    const done = await db.sessions.get(s.id);
    expect(done?.status).toBe("completed");
    expect(done?.rpe).toBe(4);
    expect(done?.note).toBe("boa");
    expect(done?.ended_at).toBeGreaterThan(0);
  });

  it("soft delete não remove fisicamente", async () => {
    const s = await createSession(1);
    await softDeleteSession(s.id);
    const row = await db.sessions.get(s.id);
    expect(row).toBeDefined();
    expect(row?.deleted_at).toBeGreaterThan(0);
    expect(await getActiveSession()).toBeUndefined();
  });
});

describe("treino avulso (freeform)", () => {
  it("nasce completo, sem plan_day_id, com duração aproximada", async () => {
    const s = await createFreeformSession(30);
    expect(s.status).toBe("completed");
    expect(s.source).toBe("freeform");
    expect(s.plan_day_id).toBeNull();
    expect(s.ended_at).not.toBeNull();
    expect((s.ended_at as number) - s.started_at).toBeCloseTo(30 * 60_000, -2);
  });

  it("duração omitida gera started_at = ended_at", async () => {
    const s = await createFreeformSession();
    expect(s.ended_at).toBe(s.started_at);
  });

  it("não aparece como sessão ativa (já nasce completa)", async () => {
    await createFreeformSession(15);
    expect(await getActiveSession()).toBeUndefined();
  });

  it("desfazer (soft delete) some da consulta ativa/histórico", async () => {
    const s = await createFreeformSession(15);
    await softDeleteSession(s.id);
    const row = await db.sessions.get(s.id);
    expect(row?.deleted_at).toBeGreaterThan(0);
  });

  it("daysAgo registra num dia passado (esqueci de registrar)", async () => {
    const yesterday = shiftDays(localDateKey(), -1);
    const s = await createFreeformSession(20, 1);
    expect(s.date).toBe(yesterday);
    expect(s.weekday).toBe(
      new Date(yesterday + "T00:00:00").getDay()
    );
    expect(s.status).toBe("completed");
    expect((s.ended_at as number) - s.started_at).toBe(20 * 60_000);
  });
});

describe("logs repository", () => {
  it("upsert é idempotente por (session, exercise)", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: false,
      sets: [{ index: 0, value: 3 }],
      flags_selected: ["kip apareceu"],
      skipped: false,
    });
    const logs = await getLogsForSession(s.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].as_target).toBe(false);
    expect(logs[0].flags_selected).toEqual(["kip apareceu"]);
  });

  it("removeLog faz soft delete", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await removeLog(s.id, "mu-puxada-explosiva");
    expect(await getLogsForSession(s.id)).toHaveLength(0);
  });
});

describe("logs repository — motor de progressão v2", () => {
  it("exercício mapeado (reps_rir) grava skill_id/level_at_time/criterion_met", async () => {
    const s = await createSession(1);
    const log = await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-peso-morto", // pull_up L4, reps_rir {sets:3, reps:8, rir_max:2}
      as_target: false,
      sets: [
        { index: 0, value: 8 },
        { index: 1, value: 8 },
        { index: 2, value: 8 },
      ],
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps: [8, 8, 8], rir: 1, form_ok: true },
    });
    expect(log.skill_id).toBe("pull_up");
    expect(log.level_at_time).toBe(4);
    expect(log.criteria_type).toBe("reps_rir");
    expect(log.criterion_met).toBe(true);
  });

  it("exercício mapeado sem sets_performed → criterion_met null, sem quebrar", async () => {
    const s = await createSession(1);
    const log = await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-peso-morto",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    expect(log.skill_id).toBe("pull_up");
    expect(log.criterion_met).toBeNull();
  });

  it("exercício sem mapeamento → os 5 campos do motor ficam null", async () => {
    const s = await createSession(1);
    const log = await upsertLog({
      session_id: s.id,
      exercise_id: "mu-false-grip-hang", // acessório, sem skill_id
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    expect(log.skill_id).toBeNull();
    expect(log.level_at_time).toBeNull();
    expect(log.criteria_type).toBeNull();
    expect(log.sets_performed).toBeNull();
    expect(log.criterion_met).toBeNull();
  });

  it("regravar (upsert) recalcula criterion_met com o novo sets_performed", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-peso-morto",
      as_target: false,
      sets: [{ index: 0, value: 5 }],
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps: [5, 5, 5], rir: 2, form_ok: true },
    });
    const updated = await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-peso-morto",
      as_target: false,
      sets: [{ index: 0, value: 8 }],
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps: [8, 8, 8], rir: 2, form_ok: true },
    });
    expect(updated.criterion_met).toBe(true);
    const logs = await getLogsForSession(s.id);
    expect(logs).toHaveLength(1);
  });
});

describe("última performance", () => {
  it("as_target vira 'como previsto'", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await completeSession(s.id, 3, null);
    const perf = await getLastPerformance("mu-puxada-explosiva");
    expect(perf.kind).toBe("as_target");
  });

  it("sem histórico → none", async () => {
    const perf = await getLastPerformance("mu-puxada-explosiva");
    expect(perf.kind).toBe("none");
  });

  it("exclui a própria sessão em andamento", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await completeSession(s.id, 3, null);
    const perf = await getLastPerformance("mu-puxada-explosiva", s.id);
    expect(perf.kind).toBe("none");
  });

  it("é cross-day: exercício com ID compartilhado vê histórico de outro dia", async () => {
    // mu-false-grip-hang aparece na Seg (1) e na Qui (4).
    // Registra na segunda; na quinta a última performance deve enxergar.
    const seg = await createSession(1);
    await upsertLog({
      session_id: seg.id,
      exercise_id: "mu-false-grip-hang",
      as_target: false,
      sets: [
        { index: 0, value: 22 },
        { index: 1, value: 18 },
      ],
      flags_selected: [],
      skipped: false,
    });
    await completeSession(seg.id, 3, null);

    const perf = await getLastPerformance("mu-false-grip-hang");
    expect(perf.kind).toBe("sets");
    if (perf.kind === "sets") expect(perf.values).toEqual([22, 18]);
  });
});

describe("backup export/import", () => {
  it("ciclo completo: export → limpar → import mantém histórico", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-puxada-explosiva",
      as_target: true,
      sets: null,
      flags_selected: ["chegou no esterno"],
      skipped: false,
    });
    await completeSession(s.id, 4, "teste");

    const dump = await exportAll();
    await db.sessions.clear();
    await db.exerciseLogs.clear();
    expect(await db.sessions.count()).toBe(0);

    const r = await importMerge(dump);
    expect(r.sessionsAdded).toBe(1);
    expect(r.logsAdded).toBe(1);
    const restored = await db.sessions.get(s.id);
    expect(restored?.rpe).toBe(4);
  });

  it("arquivo corrompido falha sem tocar no banco", async () => {
    const s = await createSession(1);
    await expect(importMerge({ garbage: true })).rejects.toThrow();
    expect(await db.sessions.count()).toBe(1);
    expect((await db.sessions.get(s.id))?.status).toBe("in_progress");
  });

  it("merge não sobrescreve registro local mais novo", async () => {
    const s = await createSession(1);
    await completeSession(s.id, 2, "antigo");
    const dump = await exportAll();
    // torna o local mais novo
    await completeSession(s.id, 5, "novo");
    const r = await importMerge(dump);
    expect(r.sessionsUpdated).toBe(0);
    expect((await db.sessions.get(s.id))?.rpe).toBe(5);
  });

  it("ciclo completo com treino avulso (plan_day_id null)", async () => {
    const s = await createFreeformSession(25);
    const dump = await exportAll();
    await db.sessions.clear();
    const r = await importMerge(dump);
    expect(r.sessionsAdded).toBe(1);
    const restored = await db.sessions.get(s.id);
    expect(restored?.source).toBe("freeform");
    expect(restored?.plan_day_id).toBeNull();
  });

  it("backup antigo sem `source` importa como 'plan' (compat)", async () => {
    const legacy = {
      format: "calistenia-tracker-backup",
      version: 1,
      exported_at: new Date().toISOString(),
      plan: { id: "calistenia-v1", version: 1 },
      sessions: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          plan_day_id: "calistenia-v1:1",
          plan_version: 1,
          weekday: 1,
          date: "2026-01-05",
          status: "completed",
          started_at: 1,
          ended_at: 2,
          rpe: 3,
          note: null,
          updated_at: 2,
          deleted_at: null,
        },
      ],
      exerciseLogs: [],
    };
    const r = await importMerge(legacy);
    expect(r.sessionsAdded).toBe(1);
    const restored = await db.sessions.get(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(restored?.source).toBe("plan");
  });

  it("backup antigo sem campos do motor v2 importa com null (compat)", async () => {
    const legacy = {
      format: "calistenia-tracker-backup",
      version: 1,
      exported_at: new Date().toISOString(),
      plan: { id: "calistenia-v1", version: 1 },
      sessions: [],
      exerciseLogs: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          session_id: "33333333-3333-4333-8333-333333333333",
          exercise_id: "pull-up-peso-morto",
          as_target: true,
          sets: null,
          flags_selected: [],
          skipped: false,
          logged_at: 1,
          updated_at: 1,
          deleted_at: null,
        },
      ],
    };
    const r = await importMerge(legacy);
    expect(r.logsAdded).toBe(1);
    const restored = await db.exerciseLogs.get(
      "22222222-2222-4222-8222-222222222222"
    );
    expect(restored?.skill_id).toBeNull();
    expect(restored?.sets_performed).toBeNull();
    expect(restored?.criterion_met).toBeNull();
  });
});
