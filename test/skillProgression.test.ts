import { describe, it, expect, beforeEach } from "vitest";
import { db, type SetPerformed } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { evaluateCriterion, getSkillState } from "@/lib/db/queries/skillProgression";
import type { Criteria } from "@/lib/plan/skills";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("evaluateCriterion", () => {
  const repsRir: Criteria = {
    type: "reps_rir",
    sets: 3,
    reps: 8,
    rir_max: 2,
    sessions_required: 2,
  };

  it("reps_rir: bate reps, rir no limite e forma limpa → true", () => {
    const performed: SetPerformed = {
      type: "reps_rir",
      reps: [8, 8, 8],
      rir: 2,
      form_ok: true,
    };
    expect(evaluateCriterion(performed, repsRir)).toBe(true);
  });

  it("reps_rir: rir acima do máximo → false", () => {
    const performed: SetPerformed = {
      type: "reps_rir",
      reps: [8, 8, 8],
      rir: 3,
      form_ok: true,
    };
    expect(evaluateCriterion(performed, repsRir)).toBe(false);
  });

  it("reps_rir: 1 série abaixo do alvo → false", () => {
    const performed: SetPerformed = {
      type: "reps_rir",
      reps: [8, 8, 7],
      rir: 2,
      form_ok: true,
    };
    expect(evaluateCriterion(performed, repsRir)).toBe(false);
  });

  it("reps_rir: RIR não declarado (null) avalia só reps e forma", () => {
    expect(
      evaluateCriterion({ type: "reps_rir", reps: [8, 8, 8], rir: null, form_ok: true }, repsRir)
    ).toBe(true);
    expect(
      evaluateCriterion({ type: "reps_rir", reps: [8, 8, 7], rir: null, form_ok: true }, repsRir)
    ).toBe(false);
    expect(
      evaluateCriterion({ type: "reps_rir", reps: [8, 8, 8], rir: null, form_ok: false }, repsRir)
    ).toBe(false);
  });

  it("reps_rir: forma suja → false mesmo com reps/rir ok", () => {
    const performed: SetPerformed = {
      type: "reps_rir",
      reps: [8, 8, 8],
      rir: 1,
      form_ok: false,
    };
    expect(evaluateCriterion(performed, repsRir)).toBe(false);
  });

  const holdClean: Criteria = {
    type: "hold_clean",
    sets: 3,
    duration_seconds: 30,
    sessions_required: 2,
  };

  it("hold_clean: todas as séries no alvo e forma limpa → true", () => {
    const performed: SetPerformed = {
      type: "hold_clean",
      durations_seconds: [30, 31, 35],
      form_ok: true,
    };
    expect(evaluateCriterion(performed, holdClean)).toBe(true);
  });

  it("hold_clean: 1 série abaixo do alvo → false", () => {
    const performed: SetPerformed = {
      type: "hold_clean",
      durations_seconds: [30, 29, 35],
      form_ok: true,
    };
    expect(evaluateCriterion(performed, holdClean)).toBe(false);
  });

  const skillConsistency: Criteria = {
    type: "skill_consistency",
    sets: 1,
    attempts: 10,
    consistency_ratio: 0.5,
    sessions_required: 2,
  };

  it("skill_consistency: ratio exatamente no limite → true", () => {
    const performed: SetPerformed = {
      type: "skill_consistency",
      attempts_total: 10,
      attempts_good: 5,
    };
    expect(evaluateCriterion(performed, skillConsistency)).toBe(true);
  });

  it("skill_consistency: ratio abaixo do limite → false", () => {
    const performed: SetPerformed = {
      type: "skill_consistency",
      attempts_total: 10,
      attempts_good: 4,
    };
    expect(evaluateCriterion(performed, skillConsistency)).toBe(false);
  });

  it("skill_consistency: zero tentativas → false (não divide por zero)", () => {
    const performed: SetPerformed = {
      type: "skill_consistency",
      attempts_total: 0,
      attempts_good: 0,
    };
    expect(evaluateCriterion(performed, skillConsistency)).toBe(false);
  });

  it("tipo incompatível entre performed e criteria → false, não lança", () => {
    const performed: SetPerformed = {
      type: "hold_clean",
      durations_seconds: [30],
      form_ok: true,
    };
    expect(evaluateCriterion(performed, repsRir)).toBe(false);
  });
});

describe("getSkillState", () => {
  const EX = "pull-up-peso-morto"; // pull_up L4, reps_rir, sessions_required 2

  async function logPullUp(reps: number[], rir: number, formOk: boolean) {
    const s = await createSession("A");
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: false,
      sets: reps.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps, rir, form_ok: formOk },
    });
    await completeSession(s.id, 3, null);
  }

  it("sem logs → tracking", async () => {
    expect(await getSkillState("pull_up", 4)).toBe("tracking");
  });

  it("2 sessões batendo o critério → ready", async () => {
    await logPullUp([8, 8, 8], 2, true);
    await logPullUp([8, 8, 8], 1, true);
    expect(await getSkillState("pull_up", 4)).toBe("ready");
  });

  it("3 sessões seguidas falhando → regress", async () => {
    await logPullUp([5, 5, 5], 2, true);
    await logPullUp([5, 5, 5], 2, true);
    await logPullUp([5, 5, 5], 2, true);
    expect(await getSkillState("pull_up", 4)).toBe("regress");
  });

  it("1 sessão batendo, insuficiente pro streak → tracking", async () => {
    await logPullUp([8, 8, 8], 2, true);
    expect(await getSkillState("pull_up", 4)).toBe("tracking");
  });

  it("8+ sessões sem fechar ready nem regress → stale", async () => {
    // alterna sucesso/falha pra nunca fechar um streak de 2 (ready) nem 3 (regress)
    for (let i = 0; i < 8; i++) {
      await logPullUp([8, 8, 8], 2, i % 2 === 0);
    }
    expect(await getSkillState("pull_up", 4)).toBe("stale");
  });
});

describe("getSkillState — tentativas (skill_consistency)", () => {
  const HS = "hs-kickup-livre"; // handstand_hold L5: 5/10 boas, 2 sessões

  async function logAttempts(good: number, total = 10) {
    const s = await createSession("B");
    await upsertLog({
      session_id: s.id,
      exercise_id: HS,
      as_target: false,
      sets: null,
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "skill_consistency", attempts_total: total, attempts_good: good },
    });
    await completeSession(s.id, 3, null);
  }

  it("abaixo da proporção 3× seguidas é só 'ainda não', não regressão", async () => {
    await logAttempts(3);
    await logAttempts(2);
    await logAttempts(4);
    expect(await getSkillState("handstand_hold", 5)).toBe("tracking");
  });

  it("nenhuma boa em 3 sessões seguidas → regress", async () => {
    await logAttempts(0);
    await logAttempts(0);
    await logAttempts(0);
    expect(await getSkillState("handstand_hold", 5)).toBe("regress");
  });

  it("2 sessões na proporção → ready", async () => {
    await logAttempts(5);
    await logAttempts(6);
    expect(await getSkillState("handstand_hold", 5)).toBe("ready");
  });
});

describe("getSkillState — sessão de manutenção", () => {
  const EX = "pull-up-peso-morto"; // pull_up L4: 3×8

  async function logDay(target: string, sets: number, reps: number) {
    const s = await createSession("A");
    const values = Array.from({ length: sets }, () => reps);
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: false,
      sets: values.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps: values, rir: null, form_ok: true },
      snapshot: {
        name: "Pull-up",
        target,
        parsed: { sets, target: Number(target.split("×")[1]), unit: "reps", per_side: false },
      },
    });
    await completeSession(s.id, 3, null);
  }

  it("treino leve no meio (alvo abaixo do critério, cumprido) não quebra o ready", async () => {
    await logDay("3 × 8", 3, 8);
    await logDay("3 × 5", 3, 5); // manutenção: cumpriu o plano, não tinha como bater 3×8
    await logDay("3 × 8", 3, 8);
    expect(await getSkillState("pull_up", 4)).toBe("ready");
  });

  it("falhar até o alvo leve ainda conta como falha", async () => {
    await logDay("3 × 5", 3, 3);
    await logDay("3 × 5", 3, 3);
    await logDay("3 × 5", 3, 3);
    expect(await getSkillState("pull_up", 4)).toBe("regress");
  });
});
