import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { addExtraSet, setExtraSets, upsertLog, removeLog } from "@/lib/db/repositories/logs";
import {
  effectiveSets,
  extraSeed,
  extraSets,
  plannedSets,
  totalVolume,
} from "@/lib/domain/volume";
import { formatExtras } from "@/lib/domain/parseTarget";
import { getExerciseVolume } from "@/lib/db/queries/metrics";
import { getWeekReview } from "@/lib/db/queries/weekReview";
import { computePR } from "@/lib/db/queries/pr";
import { hitTarget } from "@/lib/db/queries/progressionReady";
import { getSkillState } from "@/lib/db/queries/skillProgression";
import { getLastPerformance, formatLastPerf } from "@/lib/db/queries/lastPerformance";
import { exportForAI } from "@/lib/plan/exportForAI";
import { exportAll, importMerge } from "@/lib/db/backup";
import type { Parsed } from "@/lib/plan/schema";

// pull-up-negativa-lenta: plano 4 × 4 reps, sem skill
const PU = "pull-up-negativa-lenta";
const reps4x4: Parsed = { sets: 4, target: 4, unit: "reps", per_side: false };
const holds: Parsed = { sets: 3, target: 20, unit: "seconds", per_side: false };

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function doneSession(
  opts: { asTarget?: boolean; sets?: number[]; extras?: number[]; exercise?: string } = {}
) {
  const s = await createSession(1);
  const ex = opts.exercise ?? PU;
  await upsertLog({
    session_id: s.id,
    exercise_id: ex,
    as_target: opts.asTarget ?? true,
    sets: opts.sets ? opts.sets.map((value, index) => ({ index, value })) : null,
    flags_selected: [],
    skipped: false,
  });
  for (const v of opts.extras ?? []) await addExtraSet(s.id, ex, v);
  await completeSession(s.id, 3, null);
  return s;
}

describe("domínio: planejadas vs extras", () => {
  const base = { as_target: true, sets: null, skipped: false };

  it("effectiveSets = planejadas + extras; plannedSets ignora extras", () => {
    const log = { ...base, extra_sets: [6, 5] };
    expect(plannedSets(log, reps4x4)).toEqual([4, 4, 4, 4]);
    expect(extraSets(log)).toEqual([6, 5]);
    expect(effectiveSets(log, reps4x4)).toEqual([4, 4, 4, 4, 6, 5]);
  });

  it("como previsto com parsed nulo: só as extras aparecem em effectiveSets", () => {
    expect(effectiveSets({ ...base, extra_sets: [7] }, null)).toEqual([7]);
    expect(plannedSets({ ...base, extra_sets: [7] }, null)).toEqual([]);
  });

  it("ajustado + extras", () => {
    const log = {
      as_target: false,
      skipped: false,
      sets: [{ index: 0, value: 5 }, { index: 1, value: 4 }],
      extra_sets: [3],
    };
    expect(effectiveSets(log, reps4x4)).toEqual([5, 4, 3]);
  });

  it("pulado ignora extras (e extras inválidas)", () => {
    expect(extraSets({ skipped: true, extra_sets: [5] })).toEqual([]);
    expect(extraSets({ skipped: false, extra_sets: [0, -2, 4] })).toEqual([4]);
    expect(extraSets({ skipped: false })).toEqual([]);
  });

  it("volume total inclui extras, e per_side dobra tudo", () => {
    expect(totalVolume({ ...base, extra_sets: [6] }, reps4x4)).toBe(16 + 6);
    const perSide: Parsed = { ...reps4x4, per_side: true };
    expect(totalVolume({ ...base, extra_sets: [6] }, perSide)).toBe((16 + 6) * 2);
  });

  it("extraSeed repete a última série feita; sem nada, usa o alvo", () => {
    expect(extraSeed({ ...base, extra_sets: [6] }, reps4x4)).toBe(6);
    expect(extraSeed({ ...base }, reps4x4)).toBe(4);
    expect(extraSeed({ ...base, as_target: false, sets: null }, null)).toBe(1);
  });

  it("formatExtras", () => {
    expect(formatExtras([], reps4x4)).toBe("");
    expect(formatExtras([6, 5], reps4x4)).toBe(" + extra 6/5");
    expect(formatExtras([20], holds)).toBe(" + extra 20s");
  });
});

describe("repositório", () => {
  it("addExtraSet acrescenta na ordem e mantém as séries planejadas", async () => {
    const s = await doneSession({ asTarget: true });
    await addExtraSet(s.id, PU, 6);
    const log = await addExtraSet(s.id, PU, 5);
    expect(log?.extra_sets).toEqual([6, 5]);
    expect(log?.as_target).toBe(true);
    expect(log?.sets).toBeNull();
  });

  it("sem log do exercício → null e nada é gravado", async () => {
    const s = await createSession(1);
    expect(await addExtraSet(s.id, PU, 6)).toBeNull();
    expect(await db.exerciseLogs.count()).toBe(0);
  });

  it("exercício pulado não aceita extra", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: false,
      sets: null,
      flags_selected: [],
      skipped: true,
    });
    expect(await addExtraSet(s.id, PU, 6)).toBeNull();
    expect((await db.exerciseLogs.toArray())[0].extra_sets ?? null).toBeNull();
  });

  it("setExtraSets descarta inválidos, arredonda e grava null quando vazio", async () => {
    const s = await doneSession();
    const a = await setExtraSets(s.id, PU, [5.6, 0, -1, NaN, 3]);
    expect(a?.extra_sets).toEqual([6, 3]);
    const b = await setExtraSets(s.id, PU, []);
    expect(b?.extra_sets).toBeNull();
  });

  it("desfazer = restaurar as extras anteriores", async () => {
    const s = await doneSession({ extras: [6] });
    await addExtraSet(s.id, PU, 6);
    const restored = await setExtraSets(s.id, PU, [6]);
    expect(restored?.extra_sets).toEqual([6]);
  });

  it("regravar o exercício (upsert) preserva as extras", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await addExtraSet(s.id, PU, 6);
    const again = await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: false,
      sets: [4, 4, 4, 4].map((value, index) => ({ index, value })),
      flags_selected: ["x"],
      skipped: false,
    });
    expect(again.extra_sets).toEqual([6]);
  });

  it("upsert com extra_sets grava no registro novo e substitui no re-registro", async () => {
    const s = await createSession(1);
    const first = await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: false,
      sets: [4, 4, 4, 4].map((value, index) => ({ index, value })),
      extra_sets: [6],
      flags_selected: [],
      skipped: false,
    });
    expect(first.extra_sets).toEqual([6]);
    const replaced = await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: false,
      sets: [4, 4, 4, 4].map((value, index) => ({ index, value })),
      extra_sets: [6, 5],
      flags_selected: [],
      skipped: false,
    });
    expect(replaced.extra_sets).toEqual([6, 5]);
  });

  it("upsert sem extra_sets (undefined) mantém as existentes; null limpa", async () => {
    const s = await doneSession({ extras: [6] });
    const kept = await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: true,
      sets: null,
      flags_selected: ["x"],
      skipped: false,
    });
    expect(kept.extra_sets).toEqual([6]);
    const cleared = await upsertLog({
      session_id: s.id,
      exercise_id: PU,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
      extra_sets: null,
    });
    expect(cleared.extra_sets).toBeNull();
  });

  it("recorde considera as extras enviadas junto do registro", async () => {
    await doneSession(); // melhor histórico = 4
    const pr = await computePR(
      PU,
      {
        as_target: false,
        sets: [4, 4, 4, 4].map((value, index) => ({ index, value })),
        extra_sets: [7],
        skipped: false,
        flags_selected: [],
      },
      reps4x4
    );
    expect(pr).toEqual({ value: 7, unit: "reps" });
  });

  it("não mexe em logged_at nem em sets_performed (extra não entra na progressão)", async () => {
    const s = await doneSession();
    const before = (await db.exerciseLogs.toArray())[0];
    await addExtraSet(s.id, PU, 6);
    const after = (await db.exerciseLogs.toArray())[0];
    expect(after.logged_at).toBe(before.logged_at);
    expect(after.sets_performed).toEqual(before.sets_performed);
    expect(after.criterion_met).toEqual(before.criterion_met);
  });

  it("desmarcar o exercício (removeLog) leva as extras junto nas métricas", async () => {
    const s = await doneSession({ extras: [6] });
    await removeLog(s.id, PU);
    expect(await getExerciseVolume(PU)).toEqual([]);
  });
});

describe("métricas contam a série extra normalmente", () => {
  it("volume do exercício inclui extras", async () => {
    await doneSession({ extras: [6, 5] });
    const [pt] = await getExerciseVolume(PU);
    expect(pt.volume).toBe(16 + 6 + 5);
  });

  it("volume semanal inclui extras", async () => {
    const withExtra = await doneSession({ extras: [10] });
    const review = await getWeekReview(
      // segunda da semana da sessão criada hoje
      (await import("@/lib/utils/date")).weekStartKey(withExtra.date)
    );
    expect(review?.volume).toBe(16 + 10);
  });

  it("recorde: uma série extra pode ser o recorde", async () => {
    await doneSession(); // melhor histórico = 4
    const pr = await computePR(
      PU,
      {
        as_target: false,
        sets: [{ index: 0, value: 6 }], // só a extra
        skipped: false,
        flags_selected: [],
      },
      reps4x4
    );
    expect(pr).toEqual({ value: 6, unit: "reps" });
  });

  it("recorde: extra de sessão passada entra no melhor histórico", async () => {
    await doneSession({ extras: [9] });
    const pr = await computePR(
      PU,
      { as_target: false, sets: [{ index: 0, value: 7 }], skipped: false, flags_selected: [] },
      reps4x4
    );
    expect(pr).toBeNull(); // 7 < 9 (a extra antiga)
  });
});

describe("a progressão NÃO é afetada por extras", () => {
  it("hitTarget ignora extras: 4ª série cansada não reprova o treino", () => {
    const log = {
      as_target: false,
      skipped: false,
      sets: [4, 4, 4, 4].map((value, index) => ({ index, value })),
      extra_sets: [2], // extra abaixo do alvo
    };
    expect(hitTarget(log, 4)).toBe(true);
  });

  it("estado da skill não muda com extra abaixo do critério", async () => {
    // muscle_up nível 3 · 3×3 reps, rir ≤ 2
    for (let i = 0; i < 2; i++) {
      await new Promise((r) => setTimeout(r, 3));
      const s = await createSession(1);
      await upsertLog({
        session_id: s.id,
        exercise_id: "mu-negativa-transicao",
        as_target: false,
        sets: [3, 3, 3].map((value, index) => ({ index, value })),
        flags_selected: [],
        skipped: false,
        sets_performed: { type: "reps_rir", reps: [3, 3, 3], rir: 2, form_ok: true },
      });
      await addExtraSet(s.id, "mu-negativa-transicao", 1); // extra fraquinha
      await completeSession(s.id, 3, null);
    }
    expect(await getSkillState("muscle_up", 3)).toBe("ready");
  });
});

describe("última performance", () => {
  it("como previsto + extra", async () => {
    await doneSession({ extras: [6] });
    const perf = await getLastPerformance(PU);
    expect(perf.kind).toBe("as_target");
    expect(formatLastPerf(perf, reps4x4)).toContain("como previsto + extra 6");
  });

  it("ajustado: values são só as planejadas (semente dos steppers), extras à parte", async () => {
    await doneSession({ asTarget: false, sets: [5, 4, 4, 4], extras: [3] });
    const perf = await getLastPerformance(PU);
    expect(perf.kind).toBe("sets");
    if (perf.kind === "sets") {
      expect(perf.values).toEqual([5, 4, 4, 4]);
      expect(perf.extra).toEqual([3]);
    }
    expect(formatLastPerf(perf, reps4x4)).toContain("5/4/4/4 + extra 3");
  });

  it("sem extras o texto não muda", async () => {
    await doneSession();
    const perf = await getLastPerformance(PU);
    expect(formatLastPerf(perf, reps4x4)).not.toContain("extra");
  });
});

describe("export pra IA separa planejado de extra", () => {
  it("performed só com o plano; extra_sets à parte", async () => {
    await doneSession({ asTarget: false, sets: [4, 4, 4, 4], extras: [6] });
    const { sessions } = await exportForAI();
    const ex = sessions[0].exercises[0];
    expect(ex.performed).toEqual([4, 4, 4, 4]);
    expect(ex.extra_sets).toEqual([6]);
  });

  it("sem extras a chave nem aparece", async () => {
    await doneSession();
    const { sessions } = await exportForAI();
    expect("extra_sets" in sessions[0].exercises[0]).toBe(false);
  });
});

describe("backup preserva as extras", () => {
  it("ciclo export → limpar → import", async () => {
    await doneSession({ extras: [6, 5] });
    const dump = await exportAll();
    await db.sessions.clear();
    await db.exerciseLogs.clear();
    await importMerge(dump);
    const [log] = await db.exerciseLogs.toArray();
    expect(log.extra_sets).toEqual([6, 5]);
  });

  it("backup antigo (sem extra_sets) importa com null", async () => {
    await doneSession();
    const legacy = JSON.parse(JSON.stringify(await exportAll()));
    delete legacy.exerciseLogs[0].extra_sets;
    await db.exerciseLogs.clear();
    await importMerge(legacy);
    const [log] = await db.exerciseLogs.toArray();
    expect(log.extra_sets).toBeNull();
  });
});
