import { describe, it, expect, beforeEach, vi } from "vitest";
import { swapSignal, type SwapInput } from "@/lib/domain/planSwap";

const base: SwapInput = {
  readyIds: ["a", "b"],
  skillCount: 6,
  sessionsSinceSwap: 3,
  cycleLength: 3,
  acked: [],
};

describe("swapSignal", () => {
  it("dois degraus prontos e um ciclo completo → avisa", () => {
    expect(swapSignal(base).show).toBe(true);
  });

  it("um degrau só não basta num plano com muitos", () => {
    expect(swapSignal({ ...base, readyIds: ["a"] }).show).toBe(false);
  });

  it("plano pequeno: metade dos degraus vale (1 de 2)", () => {
    expect(swapSignal({ ...base, readyIds: ["a"], skillCount: 2 }).show).toBe(true);
    expect(swapSignal({ ...base, readyIds: ["a"], skillCount: 1 }).show).toBe(true);
  });

  it("sem exercício de skill no plano nunca avisa", () => {
    expect(swapSignal({ ...base, readyIds: [], skillCount: 0 }).show).toBe(false);
  });

  it("antes de um ciclo inteiro desde a troca, não avisa", () => {
    expect(swapSignal({ ...base, sessionsSinceSwap: 2 }).show).toBe(false);
  });

  it("dispensado: some, mas volta se aparecer um id novo", () => {
    expect(swapSignal({ ...base, acked: ["a", "b"] }).show).toBe(false);
    expect(swapSignal({ ...base, readyIds: ["a", "b", "c"], acked: ["a", "b"] }).show).toBe(true);
  });

  it("conjunto que encolhe depois da dispensa não reaviso", () => {
    expect(swapSignal({ ...base, readyIds: ["a", "b"], acked: ["a", "b", "c"] }).show).toBe(false);
  });
});

describe("carimbo da troca de plano", () => {
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

  const plan = { id: "p" } as never;

  it("aplicar um plano carimba; a recuperação do boot não", async () => {
    const { applyPlan } = await import("@/lib/plan/importPlan");
    const { getPlanAppliedAt } = await import("@/lib/utils/planSwap");

    applyPlan(plan, { recovered: true });
    expect(getPlanAppliedAt()).toBeNull();

    applyPlan(plan);
    expect(getPlanAppliedAt()).toBeGreaterThan(0);
  });

  it("dispensa guarda e devolve os ids; storage corrompido vira lista vazia", async () => {
    const { ackSwap, getSwapAck, SWAP_ACK_KEY } = await import("@/lib/utils/planSwap");
    ackSwap(["a", "b"]);
    expect(getSwapAck()).toEqual(["a", "b"]);
    store[SWAP_ACK_KEY] = "{nao-json";
    expect(getSwapAck()).toEqual([]);
  });

  it("aplicar plano novo zera a dispensa: ids atravessam planos", async () => {
    const { ackSwap, getSwapAck, markPlanApplied } = await import("@/lib/utils/planSwap");
    ackSwap(["mu-puxada-explosiva"]);
    markPlanApplied();
    expect(getSwapAck()).toEqual([]);
  });
});
