import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setFlash, takeFlash } from "@/lib/utils/flash";

// Node não tem sessionStorage: um Map basta pra o contrato de ler-e-apagar.
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("flash", () => {
  it("o recado aparece uma vez só", () => {
    setFlash({ message: "Plano trocado.", variant: "success" });
    expect(takeFlash()).toEqual({ message: "Plano trocado.", variant: "success" });
    expect(takeFlash()).toBeNull();
  });

  it("sem storage, não quebra a ação", () => {
    vi.stubGlobal("sessionStorage", undefined);
    expect(() => setFlash({ message: "x" })).not.toThrow();
    expect(takeFlash()).toBeNull();
  });
});
