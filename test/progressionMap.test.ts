import { describe, it, expect, beforeEach, vi } from "vitest";

// Plano próprio do teste: o vitest aponta plan.json pro plano pessoal do autor, e
// um teste que depende dele passa na máquina dele e quebra quando ele trocar de ciclo.
vi.mock("@/lib/plan/plan.json", () => {
  const ex = (id: string, target: string, parsed: unknown, extra = {}) => ({
    id,
    name: id,
    target,
    parsed,
    obs: "",
    rest: "descanso 60s",
    flags: ["limpo", "sujo"],
    neg_flags: ["sujo"],
    ...extra,
  });
  const workout = (id: string, exercises: unknown[]) => ({
    id,
    label: id,
    title: `Treino ${id}`,
    skill: "Barra",
    duration: "30 min",
    accent: "#8174E8",
    accent_bg: "#1D1B2B",
    is_practice: false,
    warmup: "",
    tip: "",
    blocks: [{ label: "bloco", is_skill: true, exercises }],
    progression: [],
  });
  return {
    default: {
      id: "fixture-mapa",
      version: 1,
      name: "Fixture",
      source: "teste",
      imported_at: "2026-10-22",
      workouts: [
        workout("A", [
          ex("row-inverso-barra-baixa", "3 × 10", { sets: 3, target: 10, unit: "reps", per_side: false }, {
            skill_ref: { skill_id: "pull_up", level: 2 },
          }),
          ex("plank-gen", "3 × 20s", { sets: 3, target: 20, unit: "seconds", per_side: false }),
        ]),
        workout("B", [
          ex("plank-gen", "3 × 20s", { sets: 3, target: 20, unit: "seconds", per_side: false }),
        ]),
      ],
    },
  };
});

import { db } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getProgressionMap, readyRows } from "@/lib/db/queries/progressionMap";
import { getSkillState } from "@/lib/db/queries/skillProgression";

const SKILL_EX = "row-inverso-barra-baixa";
const GEN_EX = "plank-gen";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function skillSession(reps: number[], flags: string[] = []) {
  const s = await createSession("A");
  await upsertLog({
    session_id: s.id,
    exercise_id: SKILL_EX,
    as_target: false,
    sets: reps.map((value, index) => ({ index, value })),
    flags_selected: flags,
    skipped: false,
    sets_performed: { type: "reps_rir", reps, rir: null, form_ok: flags.length === 0 },
  });
  await completeSession(s.id, 3, null);
}

async function genericSession(asTarget: boolean, flags: string[] = []) {
  const s = await createSession("B");
  await upsertLog({
    session_id: s.id,
    exercise_id: GEN_EX,
    as_target: asTarget,
    sets: asTarget ? null : [{ index: 0, value: 5 }],
    flags_selected: flags,
    skipped: false,
  });
  await completeSession(s.id, 3, null);
}

const rowOf = async (id: string, acks?: (k: string) => number | undefined) =>
  (await getProgressionMap(acks ?? (() => undefined))).find((r) => r.exerciseId === id)!;

describe("getProgressionMap", () => {
  it("lista cada exercício do plano uma vez, com os treinos em que aparece", async () => {
    const rows = await getProgressionMap(() => undefined);
    expect(rows.map((r) => r.exerciseId)).toEqual([SKILL_EX, GEN_EX]);
    expect(rows[1].workouts).toEqual(["A", "B"]);
    expect(rows.every((r) => r.state === "new" && r.sessions === 0)).toBe(true);
  });

  it("exercício de skill: critério do degrau, próximo degrau e estado", async () => {
    await skillSession([10, 10, 10]);
    expect((await rowOf(SKILL_EX)).state).toBe("tracking"); // 1 de 2 sessões
    await skillSession([10, 10, 10]);

    const row = await rowOf(SKILL_EX);
    expect(row.state).toBe("ready");
    expect(row.streak).toBe(2);
    expect(row.required).toBe(2);
    expect(row.skill?.id).toBe("pull_up");
    expect(row.skill?.criteria).toBe("3×10 reps · 2 sessões seguidas");
    expect(row.skill?.next).toBeTruthy();
  });

  it("concorda com o aviso de fim de sessão (getSkillState)", async () => {
    await skillSession([10, 10, 10]);
    await skillSession([10, 10, 9]);
    expect((await rowOf(SKILL_EX)).state).toBe(await getSkillState("pull_up", 2));
  });

  it("execução suja quebra a sequência", async () => {
    await skillSession([10, 10, 10]);
    await skillSession([10, 10, 10], ["sujo"]);
    const row = await rowOf(SKILL_EX);
    expect(row.state).toBe("tracking");
    expect(row.streak).toBe(0);
  });

  it("motor genérico: duas sessões no alvo e limpas → pronto", async () => {
    await genericSession(true);
    await genericSession(true, ["limpo"]);
    const row = await rowOf(GEN_EX);
    expect(row.skill).toBeNull();
    expect(row.state).toBe("ready");
    expect(row.sessions).toBe(2);
  });

  it("dispensa: continua 'pronto', mas marcado e fora dos sinais ativos", async () => {
    await genericSession(true);
    await genericSession(true);

    const dismissedRows = await getProgressionMap(() => Date.now() + 60_000);
    const row = dismissedRows.find((r) => r.exerciseId === GEN_EX)!;
    expect(row.state).toBe("ready");
    expect(row.dismissed).toBe(true);
    expect(readyRows(dismissedRows)).toHaveLength(0);

    const active = await getProgressionMap(() => undefined);
    expect(readyRows(active).map((r) => r.exerciseId)).toEqual([GEN_EX]);
  });

  it("sessão abandonada e log pulado não votam", async () => {
    const s = await createSession("B");
    await upsertLog({
      session_id: s.id,
      exercise_id: GEN_EX,
      as_target: false,
      sets: null,
      flags_selected: [],
      skipped: true,
    });
    await completeSession(s.id, 3, null);
    expect((await rowOf(GEN_EX)).state).toBe("new");
  });
});

describe("domínio: skillStateFromVotes", () => {
  it("regress com 3 falhas reais seguidas; stale com 8 sem decisão", async () => {
    const { skillStateFromVotes } = await import("@/lib/domain/progressionState");
    const fail = { met: false, realFailure: true };
    const soft = { met: false, realFailure: false };
    expect(skillStateFromVotes([fail, fail, fail], 2)).toBe("regress");
    expect(skillStateFromVotes([fail, soft, fail], 2)).toBe("tracking");
    expect(skillStateFromVotes(Array(8).fill(soft), 2)).toBe("stale");
    expect(skillStateFromVotes([], 2)).toBe("tracking");
  });
});
