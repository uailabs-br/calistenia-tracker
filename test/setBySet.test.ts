import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  setPartialSets,
} from "@/lib/db/repositories/sessions";
import { exportAll, importMerge } from "@/lib/db/backup";
import { recordFromSets } from "@/lib/domain/setBySet";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

const reps = (sets: number, target: number) => ({ sets, target, unit: "reps" as const, per_side: false });

describe("recordFromSets", () => {
  it("todas as séries exatamente no alvo → como previsto", () => {
    expect(recordFromSets([2, 2, 2], reps(3, 2), "3 × 2")).toEqual({ as_target: true, sets: null });
  });

  it("alguma série diferente → grava as séries reais", () => {
    expect(recordFromSets([2, 2, 1], reps(3, 2), "3 × 2")).toEqual({
      as_target: false,
      sets: [
        { index: 0, value: 2 },
        { index: 1, value: 2 },
        { index: 2, value: 1 },
      ],
    });
  });

  it("menos séries que o plano (terminou antes) não é como previsto", () => {
    expect(recordFromSets([2, 2], reps(3, 2), "3 × 2").as_target).toBe(false);
  });

  it("intervalo: o teto (8/8/8) não vira como previsto, senão o volume leria o piso", () => {
    const r = recordFromSets([8, 8, 8], null, "3 × 6-8");
    expect(r.as_target).toBe(false);
    expect(r.sets?.map((s) => s.value)).toEqual([8, 8, 8]);
  });

  it("alvo sem número reconhecível grava as séries", () => {
    expect(recordFromSets([5], null, "até a falha").as_target).toBe(false);
  });
});

describe("setPartialSets", () => {
  it("grava, substitui e limpa a parcial de um exercício", async () => {
    const s = await createSession("A");
    await setPartialSets(s.id, "mu-completo", [2]);
    await setPartialSets(s.id, "mu-completo", [2, 2]);
    await setPartialSets(s.id, "pull-up", [8]);
    expect((await db.sessions.get(s.id))?.partial_sets).toEqual({ "mu-completo": [2, 2], "pull-up": [8] });

    await setPartialSets(s.id, "mu-completo", null);
    expect((await db.sessions.get(s.id))?.partial_sets).toEqual({ "pull-up": [8] });
  });

  it("vazio limpa, e o mapa some quando não sobra nada", async () => {
    const s = await createSession("A");
    await setPartialSets(s.id, "mu-completo", [2]);
    await setPartialSets(s.id, "mu-completo", []);
    expect((await db.sessions.get(s.id))?.partial_sets).toBeNull();
  });

  it("atualiza updated_at", async () => {
    const s = await createSession("A");
    const before = (await db.sessions.get(s.id))!.updated_at;
    await new Promise((r) => setTimeout(r, 2));
    await setPartialSets(s.id, "mu-completo", [2]);
    expect((await db.sessions.get(s.id))!.updated_at).toBeGreaterThan(before);
  });

  it("sessão concluída não aceita parcial", async () => {
    const s = await createSession("A");
    await completeSession(s.id, 3, null);
    expect(await setPartialSets(s.id, "mu-completo", [2])).toBeNull();
    expect((await db.sessions.get(s.id))?.partial_sets ?? null).toBeNull();
  });

  it("backup leva a parcial junto (retomada depois de restaurar)", async () => {
    const s = await createSession("A");
    await setPartialSets(s.id, "mu-completo", [2, 1]);
    const dump = await exportAll();
    await db.sessions.clear();
    await importMerge(dump);
    expect((await db.sessions.get(s.id))?.partial_sets).toEqual({ "mu-completo": [2, 1] });
  });
});
