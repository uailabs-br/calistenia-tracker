import { describe, it, expect, beforeEach } from "vitest";
import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import { createSession, completeSession } from "@/lib/db/repositories/sessions";
import { upsertLog } from "@/lib/db/repositories/logs";
import {
  exportForAI,
  exportSummary,
  buildDeclaredProfile,
  neighborSteps,
  observedFrequency,
  recurringAdded,
  repeatedSkips,
} from "@/lib/plan/exportForAI";
import { getSkillById } from "@/lib/plan/skills";
import { shiftDays } from "@/lib/utils/date";
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
    expect(plano_atual.workouts.length).toBe(plan.workouts.length);
    // dados que só existem no plano, não no resumo de sessions (obs, aquecimento etc.)
    expect(plano_atual.workouts[0].warmup).toBe(plan.workouts[0].warmup);
  });
});

describe("exportForAI — sessions", () => {
  it("resume um exercício 'como previsto', um pulado e um ajustado", async () => {
    const s = await createSession("A");
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

    expect(sessions[0].workout).toContain("A");
    expect(byId["Pull-up negativa lenta"].performed).toBe("como previsto");
    expect(byId["Toes to bar"].performed).toEqual([6, 6, 6]);
    expect(byId["Toes to bar"].flags).toEqual(["usou balanço"]);
    expect(byId["Toes to bar"].note).toBe("grip cansado");
    expect(byId["MU completo"].performed).toBe("pulado");
  });

  it("ignora sessão abandonada e log deletado", async () => {
    const inProgress = await createSession("A");
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
    const s = await createSession("A");
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

  it("sem objetivos nem notas, devolve vazio — o papel de coach está no prompt", () => {
    expect(buildPersonaText([], "")).toBe("");
  });

  it("só notas não inventa linha de objetivo", () => {
    const text = buildPersonaText([], "sem paralelas essa semana");
    expect(text).toContain("sem paralelas essa semana");
    expect(text).not.toContain("prioritárias");
  });
});

describe("exportForAI — perfil_declarado", () => {
  it("traduz o nível pra nome de skill e etapa em foco, sem jargão de índice", () => {
    const perfil = buildDeclaredProfile({
      equipment: "praca",
      level: "intermediario",
      days_per_week: 4,
    });
    expect(perfil.equipamento).toBe("praca");
    expect(perfil.nivel).toBe("intermediario");
    expect(perfil.dias_por_semana).toBe(4);
    expect(perfil.skills).toContainEqual({ skill: "Pull-up", etapa_em_foco: "Pull-up (Pronado)" });
    expect(perfil.skills).toContainEqual({ skill: "Push-up", etapa_em_foco: "Flexão Diamante" });
    expect(perfil.skills).toHaveLength(4);
  });

  it("só lista as skills que o equipamento permite", () => {
    const perfil = buildDeclaredProfile({ equipment: "chao", level: "iniciante", days_per_week: 3 });
    expect(perfil.skills.map((s) => s.skill).sort()).toEqual(["Handstand (Equilíbrio)", "Push-up"]);
  });

  it("objetivo e limitações entram no perfil", () => {
    const perfil = buildDeclaredProfile({
      equipment: "praca",
      level: "avancado",
      goal: "skills",
      limitations: ["ombro", "punho"],
      days_per_week: 5,
    });
    expect(perfil.nivel).toBe("avancado");
    expect(perfil.objetivo).toBe("skills");
    expect(perfil.limitacoes).toEqual(["ombro", "punho"]);
  });

  it("lista de limitações vazia é 'nada declarado': campo ausente, não [] no prompt", () => {
    const perfil = buildDeclaredProfile({
      equipment: "chao",
      level: "iniciante",
      goal: "forca",
      limitations: [],
      days_per_week: 3,
    });
    expect(perfil.objetivo).toBe("forca");
    expect("limitacoes" in perfil).toBe(false);
  });

  it("respostas sem objetivo nem limitações não ganham campo inventado", () => {
    const perfil = buildDeclaredProfile({ equipment: "chao", level: "iniciante", days_per_week: 3 });
    expect("objetivo" in perfil).toBe(false);
    expect("limitacoes" in perfil).toBe(false);
  });

  it("sem onboarding feito, o campo não aparece no export", async () => {
    const out = await exportForAI();
    expect("perfil_declarado" in out).toBe(false);
  });
});

describe("exportForAI — degraus fora do equipamento", () => {
  const dips = getSkillById("dips")!;
  const mu = getSkillById("muscle_up")!;
  const at = (s: typeof dips, level: number) => s.steps.findIndex((st) => st.level === level);

  it("na praça, o próximo do Dip Completo pula o Ring Dip", () => {
    const n = neighborSteps(dips, at(dips, 3), "praca");
    expect(n.proximo).toBe("Dip com Peso");
    expect(n.fora).toEqual(["Ring Dip"]);
  });

  it("regredir do Weighted Dip na praça também pula o Ring Dip", () => {
    expect(neighborSteps(dips, at(dips, 5), "praca").anterior).toBe("Dip Completo");
  });

  it("v3.1: na praça, depois do MU estrito vem o MU em L (as argolas saíram da escada)", () => {
    const n = neighborSteps(mu, at(mu, 5), "praca");
    expect(n.proximo).toBe("L-sit Muscle-up (Barra)");
    expect(n.fora).toEqual([]);
  });

  it("topo da escada não tem próximo", () => {
    const n = neighborSteps(mu, at(mu, 6), "praca");
    expect(n.proximo).toBeNull();
    expect(n.fora).toEqual([]);
  });

  it("sem perfil declarado, a escada crua", () => {
    const n = neighborSteps(dips, at(dips, 3), null);
    expect(n.proximo).toBe("Ring Dip");
    expect(n.fora).toEqual([]);
  });
});

describe("exportForAI — frequência observada", () => {
  it("dias distintos por semana nas últimas 4 semanas", () => {
    // 5 dias por semana durante 4 semanas, com dois treinos num mesmo dia
    const dates: string[] = [];
    for (let w = 0; w < 4; w++) for (let d = 0; d < 5; d++) dates.push(shiftDays("2026-10-26", -(w * 7 + d)));
    dates.push("2026-10-26", "2026-08-01"); // e um histórico mais antigo, fora da janela
    const f = observedFrequency(dates, "2026-10-26");
    expect(f).toEqual({ dias_por_semana: 5, dias_treinados: 20, periodo_dias: 28 });
  });

  it("quem começou há 2 semanas é medido desde o primeiro treino", () => {
    const dates = ["2026-10-13", "2026-10-15", "2026-10-17", "2026-10-20", "2026-10-22", "2026-10-24"];
    const f = observedFrequency(dates, "2026-10-26");
    expect(f?.periodo_dias).toBe(14);
    expect(f?.dias_por_semana).toBe(3);
  });

  it("nada nas últimas 4 semanas → sem campo", () => {
    expect(observedFrequency(["2026-08-01"], "2026-10-26")).toBeUndefined();
  });
});

describe("exportForAI — acrescentados e pulados", () => {
  const session = (id: string, extra: Partial<Session> = {}) =>
    ({ id, workout_id: "A", added_exercises: [], ...extra }) as unknown as Session;
  const log = (exercise_id: string, skipped = false) =>
    ({ exercise_id, skipped, snapshot: { name: exercise_id, target: "3 × 8", parsed: null } }) as unknown as ExerciseLog;

  it("acrescentado em 3 sessões vira sinal; em 2, não", () => {
    const entries = [1, 2, 3].map((i) => ({
      session: session(`s${i}`, { added_exercises: i < 3 ? ["rosca", "afundo"] : ["rosca"] }),
      logs: i < 3 ? [log("rosca"), log("afundo")] : [log("rosca")],
    }));
    expect(recurringAdded(entries)).toEqual([{ id: "rosca", exercicio: "rosca", sessoes: 3 }]);
  });

  it("pulado nas 3 últimas aparições seguidas; um feito no meio zera", () => {
    const inPlan = "mu-completo"; // existe no plano dos testes
    const seq = (flags: boolean[]) =>
      flags.map((skipped, i) => ({ session: session(`s${i}`), logs: [log(inPlan, skipped)] }));
    expect(repeatedSkips(seq([false, true, true, true]))).toEqual([
      { id: inPlan, exercicio: inPlan, vezes: 3 },
    ]);
    expect(repeatedSkips(seq([true, true, false, true, true]))).toEqual([]);
  });

  it("exercício que já saiu do plano não entra", () => {
    const entries = [0, 1, 2].map((i) => ({ session: session(`s${i}`), logs: [log("saiu-do-plano", true)] }));
    expect(repeatedSkips(entries)).toEqual([]);
  });
});

describe("exportForAI — etapas e resumo", () => {
  it("avisa as etapas na ordem, com o número de treinos", async () => {
    const s = await createSession("A");
    await completeSession(s.id, 3, null);
    const steps: string[] = [];
    await exportForAI({
      onStep: (e) => steps.push(e.step === "historico" ? `historico:${e.treinos}` : e.step),
    });
    expect(steps).toEqual(["historico:1", "progressao"]);
  });

  it("resume o que foi no pedido", () => {
    const fake = {
      sessions: [{}, {}, {}],
      historico_anterior: [{}, {}],
      progressao: [{ sinal: "ready" }, { sinal: "tracking" }],
      frequencia_observada: { dias_por_semana: 4.5 },
      perfil_declarado: { dias_por_semana: 3 },
    } as unknown as Parameters<typeof exportSummary>[0];
    expect(exportSummary(fake)).toEqual({
      detalhe: 3,
      resumidos: 2,
      skills: 2,
      prontas: 1,
      frequencia: 4.5,
      declarado: 3,
    });
  });
});
