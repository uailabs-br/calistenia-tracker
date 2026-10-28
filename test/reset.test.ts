import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/lib/db/schema";
import { resetAll } from "@/lib/db/backup";

// O ambiente de teste é node: sem localStorage, o resetAll pula a limpeza local.
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

beforeEach(() => {
  vi.stubGlobal("localStorage", fakeStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apagar todos os dados", () => {
  it("leva o nome, a meta e as marcas de 'já vi' do histórico; mantém as preferências do aparelho", async () => {
    await db.sessions.clear();
    const apagar = [
      "calistenia:profile-name",
      "calistenia:week-goal",
      "calistenia:plan-override",
      "calistenia:badges-seen",
      "calistenia:progression-acks",
      "calistenia:week-review-seen",
      "calistenia:ai-goals",
    ];
    const manter = ["calistenia:theme", "calistenia:reminder", "calistenia:install-dismissed"];
    for (const k of [...apagar, ...manter]) localStorage.setItem(k, "x");

    await resetAll();

    for (const k of apagar) expect(localStorage.getItem(k), k).toBeNull();
    for (const k of manter) expect(localStorage.getItem(k), k).toBe("x");
  });
});
