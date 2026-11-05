import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  ONBOARDING_DRAFT_KEY,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "@/lib/utils/onboardingDraft";

let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  });
});

const draft: OnboardingDraft = {
  step: "nivel",
  name: "Ana",
  equipment: ["parede", "barra"],
  level: "iniciante",
  days: 3,
  goal: "forca",
  focusGroups: ["peito"],
  focusSkills: [],
  limitations: [],
  picked: { goal: true, level: false, pain: false },
};

describe("rascunho do onboarding", () => {
  it("devolve o que foi salvo, e nada depois de limpar", () => {
    saveOnboardingDraft(draft);
    expect(getOnboardingDraft()).toEqual(draft);
    clearOnboardingDraft();
    expect(getOnboardingDraft()).toBeNull();
  });

  it("ignora dado corrompido ou de outra versão em vez de travar a tela", () => {
    store[ONBOARDING_DRAFT_KEY] = "{quebrado";
    expect(getOnboardingDraft()).toBeNull();
    store[ONBOARDING_DRAFT_KEY] = JSON.stringify({ ...draft, level: "mestre" });
    expect(getOnboardingDraft()).toBeNull();
  });

  it("sem storage, só perde a retomada", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    });
    expect(() => saveOnboardingDraft(draft)).not.toThrow();
    expect(getOnboardingDraft()).toBeNull();
    expect(() => clearOnboardingDraft()).not.toThrow();
  });
});
