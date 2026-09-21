import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db, type SetPerformed } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  abandonSession,
  softDeleteSession,
} from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getSkillState } from "@/lib/db/queries/skillProgression";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";
import { exportForAI } from "@/lib/plan/exportForAI";
import { exerciseSkillMapping } from "@/lib/plan/skills";
import { planSchema } from "@/lib/plan/schema";
import planData from "@/lib/plan/plan.json";
import {
  ackKeyExercise,
  ackKeySkill,
  ackProgression,
  ackedAt,
} from "@/lib/utils/progressionAck";

// muscle_up nível 3 · reps_rir 3×3 rir≤2 · plano: 3 × 3 · neg_flags: chicken wing, descida rápida demais
const MU = "mu-negativa-transicao";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

const tick = () => new Promise((r) => setTimeout(r, 3));

type Finish = "complete" | "abandon" | "delete" | "none";

async function logMu(
  opts: {
    reps?: number[];
    rir?: number | null;
    asTarget?: boolean;
    flags?: string[];
    formOk?: boolean;
    finish?: Finish;
  } = {}
) {
  const reps = opts.reps ?? [3, 3, 3];
  const rir = opts.rir === undefined ? 2 : opts.rir;
  await tick();
  const s = await createSession(1);
  const performed: SetPerformed = { type: "reps_rir", reps, rir, form_ok: opts.formOk ?? true };
  await upsertLog({
    session_id: s.id,
    exercise_id: MU,
    as_target: opts.asTarget ?? false,
    sets: opts.asTarget ? null : reps.map((value, index) => ({ index, value })),
    flags_selected: opts.flags ?? [],
    skipped: false,
    sets_performed: performed,
  });
  const finish = opts.finish ?? "complete";
  if (finish === "complete") await completeSession(s.id, 3, null);
  if (finish === "abandon") await abandonSession(s.id);
  if (finish === "delete") await softDeleteSession(s.id);
  return s;
}

describe("mapeamento exercício → nível", () => {
  it("skill_ref: null no plano desliga o mapeamento (pistol não é o nível Bulgarian)", () => {
    expect(exerciseSkillMapping("legs-pistol-split-squat")).toBeNull();
    expect(exerciseSkillMapping("hs-frog-to-hs-negativa")).toBeNull();
    expect(exerciseSkillMapping("hs-kickup-controlado")).toBeNull();
  });

  it("exercícios sem declaração seguem o mapeamento legado", () => {
    expect(exerciseSkillMapping(MU)).toEqual({
      skill_id: "muscle_up",
      level: 3,
      criteria_type: "reps_rir",
    });
    expect(exerciseSkillMapping("mu-straight-bar-dip")?.skill_id).toBe("dips");
  });
});

describe("skill_ref no schema do plano", () => {
  const withRef = (ref: unknown) => {
    const p = structuredClone(planData) as any;
    p.days[0].blocks[0].exercises[0].skill_ref = ref;
    return planSchema.safeParse(p);
  };

  it("aceita ref válida e null", () => {
    expect(withRef({ skill_id: "muscle_up", level: 3 }).success).toBe(true);
    expect(withRef(null).success).toBe(true);
  });

  it("rejeita skill inexistente e nível inexistente", () => {
    expect(withRef({ skill_id: "nao_existe", level: 1 }).success).toBe(false);
    expect(withRef({ skill_id: "muscle_up", level: 99 }).success).toBe(false);
  });

  it("rejeita campo extra na ref (strict)", () => {
    expect(withRef({ skill_id: "muscle_up", level: 3, x: 1 }).success).toBe(false);
  });

  it("o plano bundlado continua válido", () => {
    expect(planSchema.safeParse(planData).success).toBe(true);
  });
});

describe("getSkillState: só conta o que vale hoje", () => {
  it("controle: 2 sessões batendo o critério → ready", async () => {
    await logMu();
    await logMu({ rir: 1 });
    expect(await getSkillState("muscle_up", 3)).toBe("ready");
  });

  it("sessão abandonada não conta", async () => {
    await logMu();
    await logMu({ finish: "abandon" });
    expect(await getSkillState("muscle_up", 3)).toBe("tracking");
  });

  it("sessão apagada não conta", async () => {
    await logMu();
    await logMu({ finish: "delete" });
    expect(await getSkillState("muscle_up", 3)).toBe("tracking");
  });

  it("sessão em andamento conta (o aviso aparece ao fim dela)", async () => {
    await logMu();
    await logMu({ finish: "none" });
    expect(await getSkillState("muscle_up", 3)).toBe("ready");
  });

  it("log de exercício que o plano não vincula mais àquele nível é ignorado", async () => {
    // log antigo mal atrelado: pistol squat gravado como nível 2 da escada
    const s = await createSession(1);
    await db.exerciseLogs.add({
      id: "old-1",
      session_id: s.id,
      exercise_id: "legs-pistol-split-squat",
      as_target: true,
      sets: null,
      flags_selected: [],
      note: null,
      skipped: false,
      logged_at: Date.now(),
      updated_at: Date.now(),
      deleted_at: null,
      skill_id: "pistol_squat",
      level_at_time: 2,
      criteria_type: "reps_rir",
      sets_performed: { type: "reps_rir", reps: [6, 6, 6], rir: 2, form_ok: true },
      criterion_met: false,
    });
    await completeSession(s.id, 3, null);
    expect(await getSkillState("pistol_squat", 2)).toBe("tracking");
  });

  it("sem RIR (a UI não coleta mais): avalia só reps e forma", async () => {
    await logMu({ rir: null });
    await logMu({ rir: null });
    expect(await getSkillState("muscle_up", 3)).toBe("ready");
  });

  it("sem RIR mas abaixo das reps do critério → não é ready", async () => {
    await logMu({ rir: null, reps: [3, 3, 2] });
    await logMu({ rir: null, reps: [3, 3, 2] });
    expect(await getSkillState("muscle_up", 3)).not.toBe("ready");
  });

  it("dispensa: registros até `since` não contam, os novos sim", async () => {
    await logMu();
    await logMu();
    expect(await getSkillState("muscle_up", 3)).toBe("ready");

    const ackAt = Date.now() + 1;
    expect(await getSkillState("muscle_up", 3, undefined, ackAt)).toBe("tracking");

    await new Promise((r) => setTimeout(r, 5));
    await logMu();
    expect(await getSkillState("muscle_up", 3, undefined, ackAt)).toBe("tracking"); // 1 < 2
    await logMu();
    expect(await getSkillState("muscle_up", 3, undefined, ackAt)).toBe("ready"); // volta do zero
  });
});

describe("getSkillState: regress só por falha de verdade", () => {
  it("abaixo do critério da escada MAS cumprindo o plano ×3 → não é regress", async () => {
    // rir 3 (> 2) reprova o critério, mas a pessoa fez exatamente o previsto, limpo
    for (let i = 0; i < 3; i++) await logMu({ asTarget: true, rir: 3 });
    expect(await getSkillState("muscle_up", 3)).toBe("tracking");
  });

  it("abaixo do alvo do plano ×3 → regress", async () => {
    for (let i = 0; i < 3; i++) await logMu({ reps: [2, 2, 2] });
    expect(await getSkillState("muscle_up", 3)).toBe("regress");
  });

  it("execução suja (flag negativa) ×3 → regress", async () => {
    for (let i = 0; i < 3; i++) {
      await logMu({ asTarget: true, flags: ["chicken wing"], formOk: false });
    }
    expect(await getSkillState("muscle_up", 3)).toBe("regress");
  });

  it("um log neutro no meio interrompe a sequência de falhas", async () => {
    await logMu({ reps: [2, 2, 2] });
    await logMu({ reps: [2, 2, 2] });
    await logMu({ asTarget: true, rir: 3 }); // neutro (mais recente)
    await logMu({ reps: [2, 2, 2] });
    expect(await getSkillState("muscle_up", 3)).toBe("tracking");
  });

  it("usa o alvo do snapshot, não o do plano de hoje", async () => {
    // hoje o plano diz 3 reps; na época o alvo era 2 → 2 reps CUMPRIU o plano
    for (let i = 0; i < 3; i++) {
      await tick();
      const s = await createSession(1);
      await upsertLog({
        session_id: s.id,
        exercise_id: MU,
        as_target: false,
        sets: [2, 2, 2].map((value, index) => ({ index, value })),
        flags_selected: [],
        skipped: false,
        sets_performed: { type: "reps_rir", reps: [2, 2, 2], rir: 2, form_ok: true },
        snapshot: {
          name: "X",
          target: "3 × 2",
          parsed: { sets: 3, target: 2, unit: "reps", per_side: false },
        },
      });
      await completeSession(s.id, 3, null);
    }
    expect(await getSkillState("muscle_up", 3)).toBe("tracking");
  });
});

describe("getProgressionReady (motor genérico)", () => {
  const EX = "pull-up-negativa-lenta"; // 4 × 4, sem skill

  async function logGeneric(finish: Finish) {
    await tick();
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: EX,
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    if (finish === "complete") await completeSession(s.id, 3, null);
    if (finish === "abandon") await abandonSession(s.id);
    if (finish === "delete") await softDeleteSession(s.id);
  }

  it("conta a sessão em andamento (antes ignorava o treino que acabou de fazer)", async () => {
    await logGeneric("complete");
    await logGeneric("none");
    expect(await getProgressionReady(EX)).toBe(true);
  });

  it("abandonada e apagada não contam", async () => {
    await logGeneric("complete");
    await logGeneric("abandon");
    await logGeneric("delete");
    expect(await getProgressionReady(EX)).toBe(false);
  });

  it("dispensa reinicia a contagem", async () => {
    await logGeneric("complete");
    await logGeneric("complete");
    expect(await getProgressionReady(EX)).toBe(true);
    const ackAt = Date.now() + 1;
    expect(await getProgressionReady(EX, ackAt)).toBe(false);
    await new Promise((r) => setTimeout(r, 5));
    await logGeneric("complete");
    await logGeneric("complete");
    expect(await getProgressionReady(EX, ackAt)).toBe(true);
  });
});

describe("exportForAI: janela e exercícios órfãos", () => {
  it("skill sem treino há mais de 60 dias sai do resumo", async () => {
    const s = await logMu();
    const old = Date.now() - 90 * 86_400_000;
    await db.exerciseLogs.where("session_id").equals(s.id).modify({ logged_at: old });
    await db.sessions.update(s.id, { started_at: old });
    const { progressao } = await exportForAI();
    expect(progressao.find((p) => p.skill === "Muscle-up")).toBeUndefined();
  });

  it("treino recente aparece", async () => {
    await logMu();
    const { progressao } = await exportForAI();
    expect(progressao.find((p) => p.skill === "Muscle-up")).toBeDefined();
  });
});

describe("dispensa persistida (localStorage)", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("nunca dispensado → undefined", () => {
    expect(ackedAt(ackKeySkill("muscle_up", 3))).toBeUndefined();
  });

  it("grava e lê por chave, sem afetar as outras", () => {
    ackProgression(ackKeySkill("muscle_up", 3), 1000);
    ackProgression(ackKeyExercise("pull-up-negativa-lenta"), 2000);
    expect(ackedAt(ackKeySkill("muscle_up", 3))).toBe(1000);
    expect(ackedAt(ackKeyExercise("pull-up-negativa-lenta"))).toBe(2000);
    expect(ackedAt(ackKeySkill("muscle_up", 4))).toBeUndefined();
  });

  it("JSON corrompido no storage não quebra", () => {
    store.set("calistenia:progression-acks", "{nao é json");
    expect(ackedAt(ackKeySkill("muscle_up", 3))).toBeUndefined();
    ackProgression(ackKeySkill("muscle_up", 3), 5);
    expect(ackedAt(ackKeySkill("muscle_up", 3))).toBe(5);
  });
});
