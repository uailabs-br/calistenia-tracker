import { describe, it, expect } from "vitest";
import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";
import { ONBOARDING_KEY } from "@/lib/utils/onboarding";
import { SPLASH_BOOT_SCRIPT, SPLASH_SESSION_KEY } from "@/lib/utils/splash";

const USED = { [ONBOARDING_KEY]: '{"done":true}' };

/** Roda o script do <head> numa carga de página; `session` sobrevive entre cargas. */
function load(pathname: string, local: Record<string, string>, session: Map<string, string> = new Map()) {
  const attrs = new Set<string>();
  new Function("localStorage", "sessionStorage", "location", "document", SPLASH_BOOT_SCRIPT)(
    { getItem: (k: string) => local[k] ?? null },
    { getItem: (k: string) => session.get(k) ?? null, setItem: (k: string, v: string) => void session.set(k, v) },
    { pathname },
    { documentElement: { setAttribute: (k: string) => void attrs.add(k) } },
  );
  return attrs.has("data-splash");
}

describe("abertura do app", () => {
  it("aparece quando quem já usa abre o app", () => {
    expect(load("/", USED)).toBe(true);
    expect(load("/historico", USED)).toBe(true);
    expect(load("/", { [PLAN_OVERRIDE_KEY]: "{}" })).toBe(true);
  });

  it("não repete nas recargas da mesma sessão", () => {
    const session = new Map<string, string>();
    expect(load("/", USED, session)).toBe(true);
    expect(load("/", USED, session)).toBe(false);
    expect(load("/plano", USED, session)).toBe(false);
  });

  it("volta numa sessão nova", () => {
    expect(load("/", USED, new Map())).toBe(true);
    expect(load("/", USED, new Map())).toBe(true);
  });

  // "/" é a porta de entrada do estreante: o boot o leva pra landing logo depois.
  it("não aparece pra quem nunca usou, nem em /", () => {
    expect(load("/", {})).toBe(false);
  });

  it("não aparece na landing nem no onboarding", () => {
    expect(load("/sobre", USED)).toBe(false);
    expect(load("/onboarding", USED)).toBe(false);
    expect(load("/onboarding/refazer", USED)).toBe(false);
  });

  it("a recarga no fim do onboarding não conta como abertura", () => {
    const session = new Map<string, string>();
    expect(load("/", {}, session)).toBe(false);
    expect(session.get(SPLASH_SESSION_KEY)).toBe("1");
    expect(load("/", USED, session)).toBe(false);
  });

  it("sem storage fica sem abertura e não quebra a página", () => {
    const attrs = new Set<string>();
    const blocked = {
      getItem: () => {
        throw new Error("storage bloqueado");
      },
    };
    new Function("localStorage", "sessionStorage", "location", "document", SPLASH_BOOT_SCRIPT)(
      blocked,
      blocked,
      { pathname: "/" },
      { documentElement: { setAttribute: (k: string) => void attrs.add(k) } },
    );
    expect(attrs.size).toBe(0);
  });
});
