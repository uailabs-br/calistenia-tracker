import { describe, it, expect, beforeEach, vi } from "vitest";
import { isChromeless, isLanding, isOnboarding } from "@/lib/utils/routes";

// O ambiente é node: monta o mínimo de navegador que o utilitário consulta.
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  vi.unstubAllGlobals();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => void (store[k] = v),
    removeItem: (k: string) => void delete store[k],
  });
});

async function landing() {
  return import("@/lib/utils/landing");
}

describe("marca de primeira visita", () => {
  it("começa não vista e grava a marca", async () => {
    const { isLandingSeen, markLandingSeen } = await landing();
    expect(isLandingSeen()).toBe(false);
    markLandingSeen();
    expect(isLandingSeen()).toBe(true);
    expect(store["calistenia:landing-seen"]).toBe("1");
  });

  it("o reset de dados traz a primeira visita de volta", async () => {
    const { isLandingSeen, markLandingSeen, clearLandingSeen } = await landing();
    markLandingSeen();
    clearLandingSeen();
    expect(isLandingSeen()).toBe(false);
  });

  // Sem storage o boot não pode redirecionar: responder "não vista" mandaria a
  // pessoa pra /sobre em TODA carga, já que a marca nunca grava.
  it("sem storage responde que já viu, pra não repetir o redirect", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("storage bloqueado");
      },
      setItem: () => {
        throw new Error("storage bloqueado");
      },
      removeItem: () => {},
    });
    const { isLandingSeen, markLandingSeen } = await landing();
    expect(isLandingSeen()).toBe(true);
    expect(() => markLandingSeen()).not.toThrow();
  });

  it("no servidor responde que já viu", async () => {
    vi.stubGlobal("window", undefined);
    const { isLandingSeen } = await landing();
    expect(isLandingSeen()).toBe(true);
  });
});

describe("rotas sem o chrome do app", () => {
  it("landing e onboarding ficam sem nav; o resto do app mantém", () => {
    expect(isChromeless("/sobre")).toBe(true);
    expect(isChromeless("/onboarding")).toBe(true);
    expect(isChromeless("/onboarding/refazer")).toBe(true);
    expect(isChromeless("/")).toBe(false);
    expect(isChromeless("/historico")).toBe(false);
    expect(isChromeless("/skills/pull_up")).toBe(false);
  });

  it("distingue as duas, porque a largura do main difere", () => {
    expect(isLanding("/sobre")).toBe(true);
    expect(isOnboarding("/sobre")).toBe(false);
    expect(isLanding("/onboarding")).toBe(false);
    expect(isOnboarding("/onboarding")).toBe(true);
  });
});
