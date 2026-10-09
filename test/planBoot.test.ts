import { describe, it, expect, beforeEach } from "vitest";
import { db, type Session } from "@/lib/db/schema";
import { decidePlanBoot } from "@/lib/plan/boot";
import { getKnownPlan } from "@/lib/plan/plans";

const PESSOAL = "plan-calistenia-ago-2026";
const BUNDLED = "seed-iniciante-com-barra";

let n = 0;
async function addSession(over: Partial<Session> = {}): Promise<void> {
  n += 1;
  await db.sessions.add({
    id: `s-${n}`,
    plan_day_id: `${PESSOAL}:A`,
    plan_version: 1,
    workout_id: "A",
    date: "2026-10-01",
    status: "completed",
    started_at: 1_000 + n,
    ended_at: 2_000 + n,
    rpe: 3,
    note: null,
    source: "plan",
    updated_at: 1_000 + n,
    deleted_at: null,
    ...over,
  });
}

const boot = (over: Partial<Parameters<typeof decidePlanBoot>[0]> = {}) =>
  decidePlanBoot({ currentPlanId: BUNDLED, hasOverride: false, onboardingDone: false, ...over });

beforeEach(async () => {
  await db.sessions.clear();
});

describe("decidePlanBoot — recuperação pelo histórico", () => {
  it("sessão do plano pessoal e plano genérico carregado → reaplica o pessoal", async () => {
    await addSession();
    const d = await boot();
    expect(d.action).toBe("apply");
    if (d.action === "apply") expect(d.plan.id).toBe(PESSOAL);
  });

  it("sessão do próprio plano carregado → não faz nada", async () => {
    await addSession({ plan_day_id: `${BUNDLED}:B` });
    expect((await boot()).action).toBe("none");
  });

  it("plano da sessão desconhecido → avisa que se perdeu, e diz qual", async () => {
    await addSession({ plan_day_id: "plano-importado-da-ia:A" });
    expect(await boot()).toEqual({ action: "lost", planId: "plano-importado-da-ia" });
  });

  it("usa a sessão concluída MAIS RECENTE, não a primeira", async () => {
    await addSession({ plan_day_id: `${BUNDLED}:A`, started_at: 1_000 });
    await addSession({ plan_day_id: `${PESSOAL}:A`, started_at: 9_000 });
    const d = await boot();
    expect(d.action).toBe("apply");
  });

  it("ignora sessão apagada (soft delete) e sessão que não foi concluída", async () => {
    await addSession({ deleted_at: 5_000, started_at: 9_000 });
    await addSession({ status: "in_progress", ended_at: null, started_at: 9_500 });
    await addSession({ status: "abandoned", started_at: 9_600 });
    await addSession({ plan_day_id: `${BUNDLED}:A`, started_at: 1_000 });
    expect((await boot()).action).toBe("none");
  });

  it("plan_day_id malformado → não faz nada", async () => {
    await addSession({ plan_day_id: "semdoispontos" });
    expect((await boot()).action).toBe("none");
  });

  it("o id vem de tudo antes do ÚLTIMO ':'", async () => {
    await addSession({ plan_day_id: `${PESSOAL}:legacy-3` });
    const d = await boot();
    expect(d.action).toBe("apply");
    if (d.action === "apply") expect(d.plan.id).toBe(PESSOAL);
  });
});

describe("decidePlanBoot — sem loop", () => {
  it("com override NUNCA reaplica, mesmo com histórico de outro plano", async () => {
    await addSession();
    expect((await boot({ hasOverride: true })).action).toBe("none");
  });

  it("com override também não manda pro onboarding, mesmo sem sessões", async () => {
    expect((await boot({ hasOverride: true })).action).toBe("none");
  });

  it("depois de aplicar, o próximo boot (já com override) é none", async () => {
    await addSession();
    const first = await boot();
    expect(first.action).toBe("apply");
    // applyPlan grava o override; no load seguinte hasPlanOverride() é true
    expect((await boot({ hasOverride: true, currentPlanId: PESSOAL })).action).toBe("none");
  });
});

describe("decidePlanBoot — onboarding", () => {
  it("banco vazio, sem override, onboarding não feito → onboarding", async () => {
    expect((await boot()).action).toBe("onboarding");
  });

  it("onboarding já feito → none", async () => {
    expect((await boot({ onboardingDone: true })).action).toBe("none");
  });

  it("só treino avulso no banco → não é novato, none", async () => {
    await addSession({ plan_day_id: null, workout_id: null, source: "freeform" });
    expect((await boot()).action).toBe("none");
  });

  it("só sessão em andamento → não é novato, none", async () => {
    await addSession({ status: "in_progress", ended_at: null });
    expect((await boot()).action).toBe("none");
  });

  it("só sessão apagada conta como banco vazio → onboarding", async () => {
    await addSession({ deleted_at: 5_000 });
    expect((await boot()).action).toBe("onboarding");
  });
});

describe("getKnownPlan", () => {
  it("o plano reaplicado é o pessoal completo, com os 5 treinos", () => {
    expect(getKnownPlan(PESSOAL)?.workouts.map((w) => w.id)).toEqual(["A", "B", "C", "D", "E"]);
  });
});
