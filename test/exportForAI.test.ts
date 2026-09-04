import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { exportForAI } from "@/lib/plan/exportForAI";
import { buildPersonaText } from "@/lib/utils/aiPersona";
import { plan } from "@/lib/plan/loader";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

describe("exportForAI — plano_atual", () => {
  it("inclui o plano em vigor, não só o resumo do histórico", async () => {
    const { plano_atual } = await exportForAI();
    expect(plano_atual.id).toBe(plan.id);
    expect(plano_atual.days.length).toBe(plan.days.length);
    // dados que só existem no plano, não no resumo de sessions (obs, aquecimento etc.)
    expect(plano_atual.days[0].warmup).toBe(plan.days[0].warmup);
  });
});

describe("exportForAI — sessions", () => {
  it("resume um exercício 'como previsto', um pulado e um ajustado", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-negativa-lenta",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-toes-to-bar",
      as_target: false,
      sets: [0, 1, 2].map((i) => ({ index: i, value: 6 })),
      flags_selected: ["usou balanço"],
      note: "grip cansado",
      skipped: false,
    });
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-completo",
      as_target: false,
      sets: null,
      flags_selected: [],
      skipped: true,
    });
    await completeSession(s.id, 3, null);

    const { sessions } = await exportForAI();
    expect(sessions).toHaveLength(1);
    const byId = Object.fromEntries(sessions[0].exercises.map((e) => [e.name, e]));

    expect(sessions[0].day).toContain("Seg");
    expect(byId["Pull-up negativa lenta"].performed).toBe("como previsto");
    expect(byId["Toes to bar"].performed).toEqual([6, 6, 6]);
    expect(byId["Toes to bar"].flags).toEqual(["usou balanço"]);
    expect(byId["Toes to bar"].note).toBe("grip cansado");
    expect(byId["MU completo"].performed).toBe("pulado");
  });

  it("ignora sessão abandonada e log deletado", async () => {
    const inProgress = await createSession(1);
    await upsertLog({
      session_id: inProgress.id,
      exercise_id: "mu-toes-to-bar",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    // não completa essa sessão — fica in_progress, não deve aparecer

    const { sessions } = await exportForAI();
    expect(sessions).toHaveLength(0);
  });
});

describe("exportForAI — progressao", () => {
  async function logMuNegativa(reps: number[], rir: number, formOk: boolean) {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "mu-negativa-transicao", // muscle_up nível 3, reps_rir
      as_target: false,
      sets: reps.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
      sets_performed: { type: "reps_rir", reps, rir, form_ok: formOk },
    });
    await completeSession(s.id, 3, null);
  }

  it("skill nunca treinada não aparece no resumo", async () => {
    const { progressao } = await exportForAI();
    expect(progressao).toEqual([]);
  });

  it("2 sessões batendo o critério → sinal ready, com degrau anterior/próximo", async () => {
    await logMuNegativa([3, 3, 3], 2, true);
    await logMuNegativa([3, 3, 3], 1, true);

    const { progressao } = await exportForAI();
    const mu = progressao.find((p) => p.skill === "Muscle-up");
    expect(mu?.sinal).toBe("ready");
    expect(mu?.nivel_atual).toContain("Transição Negativa");
    // nível 3: degrau anterior = nível 2 (False Grip Pull-up), próximo = nível 4
    expect(mu?.degrau_anterior).toContain("False Grip Pull-up");
    expect(mu?.proximo_degrau).toContain("Muscle-up");
  });

  it("sessão única insuficiente → sinal tracking", async () => {
    await logMuNegativa([3, 3, 3], 2, true);

    const { progressao } = await exportForAI();
    const mu = progressao.find((p) => p.skill === "Muscle-up");
    expect(mu?.sinal).toBe("tracking");
  });
});

describe("buildPersonaText", () => {
  it("inclui objetivos e notas quando presentes", () => {
    const text = buildPersonaText(["Muscle-up", "Front Lever"], "ombro direito sensível");
    expect(text).toContain("Muscle-up, Front Lever");
    expect(text).toContain("ombro direito sensível");
  });

  it("sem objetivos nem notas, ainda devolve a instrução base", () => {
    const text = buildPersonaText([], "");
    expect(text).toContain("coach especialista em calistenia");
    expect(text).not.toContain("objetivos prioritários");
  });
});
