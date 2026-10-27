import { describe, it, expect, beforeEach } from "vitest";
import { db, type SetPerformed } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import { getSessionCampaign, getWorkoutCampaign } from "@/lib/db/queries/campaign";
import { getWorkoutById } from "@/lib/plan/loader";
import {
  formTip,
  outcomeLine,
  rankCampaign,
  sessionOutcome,
  shortSkillName,
  stakeLine,
  statusLabel,
  streakAfter,
  type CampaignItem,
} from "@/lib/domain/campaign";

// Plano pessoal (vitest.config): A treina o MU completo (muscle-up nível 5) e a
// negativa da transição (nível 3), B o kick-up livre (handstand nível 5) e o
// front lever de uma perna (nível 3, alvo 6-8s abaixo dos 8s do critério).
const A = getWorkoutById("A")!;
const B = getWorkoutById("B")!;

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

function item(over: Partial<CampaignItem>): CampaignItem {
  return {
    skillId: "muscle_up",
    skillName: "Muscle-up",
    level: 3,
    ladder: ["1", "2", "3", "4"],
    criteria: null,
    flags: [],
    exerciseId: "mu-negativa-transicao",
    exerciseName: "Negativa transição",
    target: "3 × 3",
    streak: 0,
    required: 2,
    ...over,
  };
}

/** Uma sessão concluída do treino com um registro estruturado. */
async function logSession(workoutId: string, exerciseId: string, performed: SetPerformed) {
  const s = await createSession(workoutId);
  await upsertLog({
    session_id: s.id,
    exercise_id: exerciseId,
    as_target: false,
    sets:
      performed.type === "reps_rir"
        ? performed.reps.map((value, index) => ({ index, value }))
        : performed.type === "hold_clean"
          ? performed.durations_seconds.map((value, index) => ({ index, value }))
          : null,
    flags_selected: [],
    skipped: false,
    sets_performed: performed,
  });
  await completeSession(s.id, 3, null);
  return s;
}

const muClean: SetPerformed = { type: "reps_rir", reps: [3, 3, 3], rir: null, form_ok: true };

describe("rankCampaign", () => {
  it("só entra objetivo marcado, e o mais perto de fechar vem primeiro", () => {
    const ranked = rankCampaign(
      [
        item({ skillId: "front_lever", streak: 0 }),
        item({ skillId: "handstand_hold", streak: 1 }),
        item({ skillId: "dips", streak: 1 }),
      ],
      ["front_lever", "handstand_hold"]
    );
    expect(ranked.map((i) => i.skillId)).toEqual(["handstand_hold", "front_lever"]);
  });

  it("empate segue a ordem em que os objetivos foram marcados", () => {
    const ranked = rankCampaign(
      [item({ skillId: "front_lever" }), item({ skillId: "muscle_up" })],
      ["muscle_up", "front_lever"]
    );
    expect(ranked.map((i) => i.skillId)).toEqual(["muscle_up", "front_lever"]);
  });

  it("dois exercícios da mesma skill: fica o nível mais alto", () => {
    const ranked = rankCampaign(
      [item({ level: 3, streak: 1 }), item({ level: 5, exerciseId: "mu-completo" })],
      ["muscle_up"]
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0].level).toBe(5);
  });
});

describe("sessionOutcome / streakAfter", () => {
  const met = { met: true, realFailure: false };
  const failed = { met: false, realFailure: true };
  const neutral = { met: false, realFailure: false, neutral: true };

  it("a sessão que faltava fecha o nível", () => {
    expect(sessionOutcome(1, met, 2)).toBe("closed");
    expect(streakAfter(1, "closed", 2)).toBe(2);
  });

  it("contou mas ainda falta", () => {
    expect(sessionOutcome(0, met, 2)).toBe("advanced");
    expect(streakAfter(0, "advanced", 2)).toBe(1);
  });

  it("não bater zera a sequência; sem sequência, só não anda", () => {
    expect(sessionOutcome(1, failed, 2)).toBe("reset");
    expect(sessionOutcome(0, failed, 2)).toBe("missed");
    expect(streakAfter(1, "reset", 2)).toBe(0);
  });

  it("voto neutro ou sem registro não conta nem quebra", () => {
    expect(sessionOutcome(1, neutral, 2)).toBe("uncounted");
    expect(sessionOutcome(1, null, 2)).toBe("uncounted");
    expect(streakAfter(1, "uncounted", 2)).toBe(1);
  });

  it("nível já batido antes da sessão fica pendente de ajustar o plano", () => {
    expect(sessionOutcome(2, met, 2)).toBe("pending");
    expect(sessionOutcome(2, null, 2)).toBe("pending");
    expect(streakAfter(3, "pending", 2)).toBe(2);
  });
});

describe("textos da campanha", () => {
  it("stakeLine diz o que está em jogo", () => {
    expect(stakeLine({ streak: 0, required: 2 })).toBe(
      "Primeira de 2 sessões seguidas. Batendo hoje, falta uma."
    );
    expect(stakeLine({ streak: 1, required: 2 })).toBe(
      "Você já fez 1 de 2. Batendo hoje, fecha o nível."
    );
    expect(stakeLine({ streak: 0, required: 3 })).toBe(
      "Primeira de 3 sessões seguidas. Batendo hoje, faltam 2."
    );
    expect(stakeLine({ streak: 0, required: 1 })).toBe("Batendo hoje, fecha o nível.");
    expect(stakeLine({ streak: 2, required: 2 })).toMatch(/já batido/);
  });

  it("outcomeLine fecha com o número certo", () => {
    expect(outcomeLine("closed", 2, 2)).toBe("2 de 2. Nível concluído.");
    expect(outcomeLine("advanced", 1, 2)).toBe(
      "1 de 2. Falta uma sessão no critério pra fechar o nível."
    );
    expect(outcomeLine("advanced", 1, 3)).toMatch(/Faltam 2 sessões/);
    expect(outcomeLine("reset", 0, 2)).toMatch(/volta pra 0 de 2/);
    expect(outcomeLine("uncounted", 1, 2, true)).toMatch(/abaixo do critério/);
  });

  it("statusLabel resume o andamento", () => {
    expect(statusLabel({ streak: 0, required: 3 })).toBe("0 de 3");
    expect(statusLabel({ streak: 1, required: 2 })).toBe("pode fechar hoje");
    expect(statusLabel({ streak: 2, required: 2 })).toBe("nível batido");
  });

  it("formTip vira frase com os dois primeiros pontos de forma", () => {
    expect(formTip(["sem impulso das pernas", "cotovelos simétricos", "terceiro"])).toBe(
      "Sem impulso das pernas. Cotovelos simétricos."
    );
    expect(formTip([])).toBeNull();
  });
});

describe("getWorkoutCampaign", () => {
  it("sem objetivo, ou objetivo que o treino não toca, não mostra nada", async () => {
    expect(await getWorkoutCampaign(A, [])).toEqual([]);
    expect(await getWorkoutCampaign(A, ["front_lever"])).toEqual([]);
  });

  it("mostra o nível que o plano treina e a sequência dos logs", async () => {
    // dois exercícios da skill no treino: vale o nível mais alto
    const [mu] = await getWorkoutCampaign(A, ["muscle_up"]);
    expect(mu).toMatchObject({
      skillId: "muscle_up",
      level: 5,
      exerciseId: "mu-completo",
      streak: 0,
      required: 2,
    });
    expect(mu.ladder.length).toBeGreaterThan(3);
    expect(mu.flags.length).toBeGreaterThan(0);

    await logSession("A", "mu-completo", muClean);
    expect((await getWorkoutCampaign(A, ["muscle_up"]))[0].streak).toBe(1);
  });

  it("dois objetivos no mesmo treino: o mais perto de fechar primeiro", async () => {
    await logSession("B", "hs-kickup-livre", {
      type: "skill_consistency",
      attempts_total: 10,
      attempts_good: 6,
    });
    const ranked = await getWorkoutCampaign(B, ["front_lever", "handstand_hold"]);
    expect(ranked.map((i) => i.skillId)).toEqual(["handstand_hold", "front_lever"]);
    expect(ranked[1]).toMatchObject({ level: 3, exerciseId: "fl-single-leg-hold" });
  });
});

describe("getSessionCampaign", () => {
  it("separa a sequência de antes e o voto da sessão: a segunda no critério fecha", async () => {
    await logSession("A", "mu-completo", muClean);
    const today = await logSession("A", "mu-completo", muClean);
    const [r] = await getSessionCampaign(A, ["muscle_up"], today.id);
    expect(r.before).toBe(1);
    expect(r.today?.met).toBe(true);
    expect(sessionOutcome(r.before, r.today, r.item.required)).toBe("closed");
  });

  it("sessão que não bate o critério zera o que tinha", async () => {
    // kick-up sem nenhuma tentativa boa é falha de verdade (não é voto neutro)
    const kick = (good: number): SetPerformed => ({
      type: "skill_consistency",
      attempts_total: 10,
      attempts_good: good,
    });
    await logSession("B", "hs-kickup-livre", kick(6));
    const today = await logSession("B", "hs-kickup-livre", kick(0));
    const [r] = await getSessionCampaign(B, ["handstand_hold"], today.id);
    expect(r.before).toBe(1);
    expect(sessionOutcome(r.before, r.today, r.item.required)).toBe("reset");
  });

  it("exercício da campanha sem registro na sessão não conta", async () => {
    const today = await createSession("A");
    await completeSession(today.id, 3, null);
    const [r] = await getSessionCampaign(A, ["muscle_up"], today.id);
    expect(r.today).toBeNull();
    expect(sessionOutcome(r.before, r.today, r.item.required)).toBe("uncounted");
  });
});

describe("shortSkillName", () => {
  it("tira o parêntese do catálogo e mantém o resto", () => {
    expect(shortSkillName("Handstand (Equilíbrio)")).toBe("Handstand");
    expect(shortSkillName("Handstand Push-up (HSPU)")).toBe("Handstand Push-up");
    expect(shortSkillName("Muscle-up")).toBe("Muscle-up");
  });
});
