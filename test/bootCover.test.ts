import { describe, it, expect } from "vitest";
import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";
import { BOOT_COVER_SCRIPT } from "@/lib/utils/bootCover";
import { ONBOARDING_KEY } from "@/lib/utils/onboarding";

function covered(pathname: string, local: Record<string, string> = {}) {
  const attrs = new Set<string>();
  new Function("localStorage", "location", "document", BOOT_COVER_SCRIPT)(
    { getItem: (k: string) => local[k] ?? null },
    { pathname },
    { documentElement: { setAttribute: (k: string) => void attrs.add(k) } },
  );
  return attrs.has("data-boot-pending");
}

describe("cobertura até o boot decidir", () => {
  it("cobre quem não tem rastro, pra home não piscar antes do redirect", () => {
    expect(covered("/")).toBe(true);
    expect(covered("/historico")).toBe(true);
  });

  it("não cobre quem já usa: a home aparece na hora", () => {
    expect(covered("/", { [ONBOARDING_KEY]: '{"done":true}' })).toBe(false);
    expect(covered("/", { [PLAN_OVERRIDE_KEY]: "{}" })).toBe(false);
  });

  it("não cobre as rotas sem chrome, onde o boot não decide", () => {
    expect(covered("/sobre")).toBe(false);
    expect(covered("/onboarding")).toBe(false);
  });

  it("sem storage não cobre nem quebra a página", () => {
    const blocked = {
      getItem: () => {
        throw new Error("storage bloqueado");
      },
    };
    const attrs = new Set<string>();
    new Function("localStorage", "location", "document", BOOT_COVER_SCRIPT)(
      blocked,
      { pathname: "/" },
      { documentElement: { setAttribute: (k: string) => void attrs.add(k) } },
    );
    expect(attrs.size).toBe(0);
  });
});
