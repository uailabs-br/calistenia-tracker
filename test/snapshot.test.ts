import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { getExerciseVolume, getLoggedExercises } from "@/lib/db/queries/metrics";
import { computePR } from "@/lib/db/queries/pr";
import { exportAll, importMerge } from "@/lib/db/backup";
import type { Parsed } from "@/lib/plan/schema";

// "mu-negativa-transicao" existe no plano (Seg) com alvo "3 × 3".
const EX = "mu-negativa-transicao";
const parsed = (sets: number, target: number): Parsed => ({
  sets,
  target,
  unit: "reps",
  per_side: false,
});

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("resolveLogExercise", () => {
  it("snapshot do log vence o plano vigente", () => {
    const r = resolveLogExercise(
      {
        exercise_id: EX,
        snapshot: { name: "Nome antigo", target: "4 × 10", parsed: parsed(4, 10) },
      },
      1
    );
    expect(r).toEqual({
      name: "Nome antigo",
      target: "4 × 10",
      parsed: parsed(4, 10),
    });
  });

  it("sem snapshot cai pro plano vigente", () => {
    const r = resolveLogExercise({ exercise_id: EX }, 1);
    expect(r.name).toBe("Negativa transição (banda 35kg)");
    expect(r.parsed?.target).toBe(3);
  });

  it("sem snapshot, dia da semana errado ainda acha o exercício no plano", () => {
    const r = resolveLogExercise({ exercise_id: EX }, 6);
    expect(r.name).toBe("Negativa transição (banda 35kg)");
  });

  it("exercício desconhecido e sem snapshot → nome null, sem alvo", () => {
    expect(resolveLogExercise({ exercise_id: "nao-existe" }, 1)).toEqual({
      name: null,
      target: "",
      parsed: null,
    });
  });
});

describe("upsertLog e o snapshot", () => {
  const base = {
    exercise_id: EX,
    as_target: true,
    sets: null,
    flags_selected: [],
    skipped: false,
  };

  it("grava o snapshot no primeiro registro", async () => {
    const s = await createSession(1);
    const log = await upsertLog({
      ...base,
      session_id: s.id,
      snapshot: { name: "X", target: "3 × 3", parsed: parsed(3, 3) },
    });
    expect(log.snapshot?.target).toBe("3 × 3");
  });

  it("regravar não sobrescreve o snapshot original", async () => {
    const s = await createSession(1);
    await upsertLog({
      ...base,
      session_id: s.id,
      snapshot: { name: "X", target: "3 × 3", parsed: parsed(3, 3) },
    });
    const again = await upsertLog({
      ...base,
      session_id: s.id,
      snapshot: { name: "Y", target: "5 × 5", parsed: parsed(5, 5) },
    });
    expect(again.snapshot?.name).toBe("X");
  });

  it("log legado sem snapshot recebe um na próxima gravação", async () => {
    const s = await createSession(1);
    const legacy = await upsertLog({ ...base, session_id: s.id });
    expect(legacy.snapshot).toBeNull();
    const again = await upsertLog({
      ...base,
      session_id: s.id,
      snapshot: { name: "X", target: "3 × 3", parsed: parsed(3, 3) },
    });
    expect(again.snapshot?.name).toBe("X");
  });
});

describe("métricas leem o alvo do momento, não o do plano de hoje", () => {
  it("volume de um 'como previsto' antigo usa o alvo do snapshot", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
      // na época o alvo era 4 × 10; o plano de hoje diz 3 × 3
      snapshot: { name: "X", target: "4 × 10", parsed: parsed(4, 10) },
    });
    await completeSession(s.id, 3, null);
    const points = await getExerciseVolume(EX);
    expect(points).toHaveLength(1);
    expect(points[0].volume).toBe(40);
  });

  it("recorde: alvo antigo mais alto não é 'batido' por série menor de hoje", async () => {
    const past = await createSession(1);
    await upsertLog({
      session_id: past.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
      snapshot: { name: "X", target: "3 × 10", parsed: parsed(3, 10) },
    });
    await completeSession(past.id, 3, null);

    // hoje: 6 reps. Com o alvo de hoje (3) lido no passado, o melhor histórico
    // viraria 3 e 6 seria "recorde". O real é 10.
    const pr = await computePR(
      EX,
      {
        as_target: false,
        sets: [{ index: 0, value: 6 }],
        skipped: false,
        flags_selected: [],
      },
      parsed(3, 3)
    );
    expect(pr).toBeNull();
  });

  it("recorde real ainda é detectado", async () => {
    const past = await createSession(1);
    await upsertLog({
      session_id: past.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
      snapshot: { name: "X", target: "3 × 4", parsed: parsed(3, 4) },
    });
    await completeSession(past.id, 3, null);
    const pr = await computePR(
      EX,
      {
        as_target: false,
        sets: [{ index: 0, value: 6 }],
        skipped: false,
        flags_selected: [],
      },
      parsed(3, 3)
    );
    expect(pr).toEqual({ value: 6, unit: "reps" });
  });

  it("getLoggedExercises inclui exercício fora do plano, com nome e unidade do snapshot", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "removido-do-plano",
      as_target: false,
      sets: [{ index: 0, value: 20 }],
      flags_selected: [],
      skipped: false,
      snapshot: {
        name: "Hold antigo",
        target: "3 × 20s",
        parsed: { sets: 3, target: 20, unit: "seconds", per_side: false },
      },
    });
    await completeSession(s.id, 3, null);
    const list = await getLoggedExercises();
    expect(list).toContainEqual({
      id: "removido-do-plano",
      name: "Hold antigo",
      unit: "seconds",
    });
  });
});

describe("backup preserva o snapshot", () => {
  it("export → limpar → import mantém o snapshot do log", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
      snapshot: { name: "X", target: "3 × 3", parsed: parsed(3, 3) },
    });
    await completeSession(s.id, 3, null);

    const dump = await exportAll();
    await db.sessions.clear();
    await db.exerciseLogs.clear();
    await importMerge(dump);

    const [log] = await db.exerciseLogs.toArray();
    expect(log.snapshot).toEqual({ name: "X", target: "3 × 3", parsed: parsed(3, 3) });
  });

  it("backup antigo (sem snapshot) importa com snapshot null", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    const dump = await exportAll();
    const legacy = JSON.parse(JSON.stringify(dump));
    delete legacy.exerciseLogs[0].snapshot;
    await db.exerciseLogs.clear();
    await importMerge(legacy);
    const [log] = await db.exerciseLogs.toArray();
    expect(log.snapshot).toBeNull();
  });
});
