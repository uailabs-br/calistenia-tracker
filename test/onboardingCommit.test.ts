import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OnboardingAnswers } from "@/lib/domain/onboarding";
import { getSeed } from "@/lib/plan/seeds";
import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";

// O ambiente é node: monta o mínimo de navegador que esses utilitários consultam.
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  });
});

const answers = (over: Partial<OnboardingAnswers> = {}): OnboardingAnswers => ({
  equipment: "praca",
  push_up: "6-15",
  pull_up: "1-2",
  handstand_hold: "segundos",
  dips: "completo",
  days_per_week: 4,
  ...over,
});

async function commit(a: OnboardingAnswers, name = "Ana", seedId: "iniciante-sem-barra" | null = null) {
  const { commitOnboarding } = await import("@/lib/utils/onboardingCommit");
  commitOnboarding({ answers: a, name, plan: seedId ? getSeed(seedId)!.plan : null });
}
const levels = () => JSON.parse(store["calistenia:skill-levels"] ?? "{}");

describe("commitOnboarding", () => {
  it("grava nome, meta, respostas e a posição de cada skill perguntada", async () => {
    await commit(answers());
    expect(store["calistenia:profile-name"]).toBe("Ana");
    expect(store["calistenia:week-goal"]).toBe("4");
    expect(JSON.parse(store["calistenia:onboarding"]).answers.push_up).toBe("6-15");
    expect(levels()).toEqual({ push_up: 2, pull_up: 3, handstand_hold: 2, dips: 2 });
  });

  it("plano null mantém o plano em uso: não mexe no override", async () => {
    store[PLAN_OVERRIDE_KEY] = '{"id":"meu-plano"}';
    await commit(answers(), "Ana", null);
    expect(store[PLAN_OVERRIDE_KEY]).toBe('{"id":"meu-plano"}');
  });

  it("com plano, aplica o override (e é a última escrita)", async () => {
    await commit(answers({ equipment: "chao" }), "Ana", "iniciante-sem-barra");
    expect(JSON.parse(store[PLAN_OVERRIDE_KEY]).id).toBe("seed-iniciante-sem-barra");
  });

  it("posição 0 não é gravada, pra não marcar 'ajuste manual' à toa", async () => {
    await commit(answers({ push_up: "0", pull_up: "nunca", handstand_hold: "nunca", dips: "nunca" }));
    expect(levels()).toEqual({});
  });

  it("refazer com resposta menor LIMPA o ajuste que o onboarding anterior deixou", async () => {
    await commit(answers({ pull_up: "3-7" }));
    expect(levels().pull_up).toBe(4);
    await commit(answers({ pull_up: "nunca" }));
    expect(levels().pull_up).toBeUndefined();
  });

  it("refazer com resposta maior sobe a posição", async () => {
    await commit(answers({ push_up: "1-5" }));
    expect(levels().push_up).toBe(1);
    await commit(answers({ push_up: "16+" }));
    expect(levels().push_up).toBe(3);
  });

  it("refazer não mexe em skill que não foi perguntada agora (mudou pra só o chão)", async () => {
    await commit(answers({ pull_up: "3-7" }));
    await commit(answers({ equipment: "chao", pull_up: undefined, dips: undefined }));
    expect(levels().pull_up).toBe(4);
  });

  it("nome em branco ao refazer limpa o nome", async () => {
    await commit(answers(), "Ana");
    await commit(answers(), "  ");
    expect(store["calistenia:profile-name"]).toBeUndefined();
  });

  it("a meta semanal acompanha a nova frequência", async () => {
    await commit(answers({ days_per_week: 5 }));
    await commit(answers({ days_per_week: 2 }));
    expect(store["calistenia:week-goal"]).toBe("2");
  });
});
