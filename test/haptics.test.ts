import { afterEach, describe, expect, it, vi } from "vitest";
import { haptic } from "@/lib/utils/haptics";

describe("haptic", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("não quebra onde não há navigator (SSR / iOS sem a API)", () => {
    vi.stubGlobal("navigator", undefined);
    expect(() => haptic()).not.toThrow();
    vi.stubGlobal("navigator", {});
    expect(() => haptic()).not.toThrow();
  });

  it("vibra pela duração pedida", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    haptic(20);
    expect(vibrate).toHaveBeenCalledWith(20);
  });

  it("fica quieto com 'reduzir movimento' ligado", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    haptic();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
