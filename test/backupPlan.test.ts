import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db/schema";
import { exportAll, importMerge } from "@/lib/db/backup";
import { createSession } from "@/lib/db/repositories/sessions";
import { PLAN_OVERRIDE_KEY } from "@/lib/plan/loader";
import seed from "@/lib/plan/seeds/iniciante-sem-barra.json";

// O ambiente de teste é node: sem window/localStorage o backup ignora o plano.
function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

const PLANO_DA_IA = JSON.stringify(seed);

beforeEach(async () => {
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", fakeStorage());
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("backup leva o plano em vigor", () => {
  it("restaurar em aparelho sem plano traz o histórico e o plano", async () => {
    localStorage.setItem(PLAN_OVERRIDE_KEY, PLANO_DA_IA);
    const s = await createSession("A");
    const dump = JSON.parse(JSON.stringify(await exportAll()));

    // aparelho novo: banco e navegador vazios
    await db.sessions.clear();
    localStorage.clear();
    const r = await importMerge(dump);

    expect(r.planRestored).toBe(true);
    expect(await db.sessions.get(s.id)).toBeDefined();
    expect(JSON.parse(localStorage.getItem(PLAN_OVERRIDE_KEY)!).id).toBe(seed.id);
  });

  it("não troca o plano que o aparelho já tem", async () => {
    localStorage.setItem(PLAN_OVERRIDE_KEY, PLANO_DA_IA);
    const dump = await exportAll();
    localStorage.setItem(PLAN_OVERRIDE_KEY, "plano-local");

    const r = await importMerge(dump);

    expect(r.planRestored).toBe(false);
    expect(localStorage.getItem(PLAN_OVERRIDE_KEY)).toBe("plano-local");
  });

  it("não reaplica quando a pessoa voltou ao plano padrão de propósito", async () => {
    localStorage.setItem(PLAN_OVERRIDE_KEY, PLANO_DA_IA);
    const dump = await exportAll();
    localStorage.clear();
    localStorage.setItem("calistenia:plan-recovery-off", "1");

    expect((await importMerge(dump)).planRestored).toBe(false);
    expect(localStorage.getItem(PLAN_OVERRIDE_KEY)).toBeNull();
  });

  it("plano inválido no arquivo é ignorado, e o histórico entra mesmo assim", async () => {
    const s = await createSession("A");
    const dump = { ...(await exportAll()), plan_override: '{"id":"quebrado"}' };
    await db.sessions.clear();

    const r = await importMerge(dump);

    expect(r.planRestored).toBe(false);
    expect(localStorage.getItem(PLAN_OVERRIDE_KEY)).toBeNull();
    expect(await db.sessions.get(s.id)).toBeDefined();
  });

  it("backup antigo, sem o campo, importa como antes", async () => {
    const legacy = JSON.parse(JSON.stringify(await exportAll()));
    delete legacy.plan_override;
    expect((await importMerge(legacy)).planRestored).toBe(false);
  });
});
