import { describe, it, expect, beforeEach, vi } from "vitest";
import type { OnboardingAnswers } from "@/lib/domain/onboarding";
import { LEGACY_GEAR } from "@/lib/domain/onboarding";
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
  equipment: LEGACY_GEAR.praca,
  level: "intermediario",
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
    expect(JSON.parse(store["calistenia:onboarding"]).answers.level).toBe("intermediario");
    expect(levels()).toEqual({ push_up: 2, pull_up: 3, handstand_hold: 2, dips: 2 });
  });

  it("plano null mantém o plano em uso: não mexe no override", async () => {
    store[PLAN_OVERRIDE_KEY] = '{"id":"meu-plano"}';
    await commit(answers(), "Ana", null);
    expect(store[PLAN_OVERRIDE_KEY]).toBe('{"id":"meu-plano"}');
  });

  it("com plano, aplica o override (e é a última escrita)", async () => {
    await commit(answers({ equipment: LEGACY_GEAR.chao }), "Ana", "iniciante-sem-barra");
    expect(JSON.parse(store[PLAN_OVERRIDE_KEY]).id).toBe("seed-iniciante-sem-barra");
  });

  it("iniciante: posição 0 não é gravada, pra não marcar 'ajuste manual' à toa", async () => {
    await commit(answers({ level: "iniciante" }));
    expect(levels()).toEqual({});
  });

  it("refazer com nível menor LIMPA o ajuste que o onboarding anterior deixou", async () => {
    await commit(answers({ level: "avancado" }));
    expect(levels().pull_up).toBe(5);
    await commit(answers({ level: "iniciante" }));
    expect(levels().pull_up).toBeUndefined();
  });

  it("refazer com nível maior sobe a posição", async () => {
    await commit(answers({ level: "intermediario" }));
    expect(levels().push_up).toBe(2);
    await commit(answers({ level: "avancado" }));
    expect(levels().push_up).toBe(3);
  });

  it("trocar pra 'só o chão' limpa barra e dips: o nível antigo não pode ficar grudado", async () => {
    await commit(answers({ level: "avancado" }));
    expect(levels()).toMatchObject({ pull_up: 5, dips: 3 });
    await commit(answers({ equipment: LEGACY_GEAR.chao, level: "avancado" }));
    expect(levels().pull_up).toBeUndefined();
    expect(levels().dips).toBeUndefined();
    // o que o equipamento ainda permite continua valendo
    expect(levels().push_up).toBe(3);
  });

  it("nome em branco ao refazer limpa o nome", async () => {
    await commit(answers(), "Ana");
    await commit(answers(), "  ");
    expect(store["calistenia:profile-name"]).toBeUndefined();
  });

  it("objetivo e limitações são gravados nas respostas (e não viram ajuste de skill)", async () => {
    await commit(answers({ goal: "skills", limitations: ["ombro"] }));
    const stored = JSON.parse(store["calistenia:onboarding"]).answers;
    expect(stored.goal).toBe("skills");
    expect(stored.limitations).toEqual(["ombro"]);
    // objetivo é direção, não capacidade: não vira posição em skill nenhuma
    expect(levels()).toEqual({ push_up: 2, pull_up: 3, handstand_hold: 2, dips: 2 });
  });

  it("respostas gravadas ANTES da pergunta de nível são lidas como o nível que implicam", async () => {
    const { getOnboardingAnswers } = await import("@/lib/utils/onboarding");
    store["calistenia:onboarding"] = JSON.stringify({
      done: true,
      at: "2026-10-08",
      answers: {
        equipment: LEGACY_GEAR.praca,
        push_up: "16+",
        pull_up: "8+",
        handstand_hold: "solto",
        dips: "8+",
        days_per_week: 4,
      },
    });
    expect(getOnboardingAnswers()?.level).toBe("avancado");
  });

  it("a meta semanal acompanha a nova frequência", async () => {
    await commit(answers({ days_per_week: 5 }));
    await commit(answers({ days_per_week: 2 }));
    expect(store["calistenia:week-goal"]).toBe("2");
  });
});
