import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  addExerciseToSession,
  removeAddedExercise,
  getSession,
} from "@/lib/db/repositories/sessions";
import { upsertLog, addExtraSet } from "@/lib/db/repositories/logs";
import {
  cleanExerciseName,
  createCustomExercise,
  customToTemplate,
  deleteCustomExercise,
  getCustomExercises,
  CUSTOM_NAME_MAX,
} from "@/lib/db/repositories/customExercises";
import { customToCatalogLike, resolveAddedExercise } from "@/lib/plan/addedExercises";
import { searchCatalog, templateToPlanExercise, catalog } from "@/lib/plan/catalog";
import { snapshotOf } from "@/lib/plan/resolve";
import { getExerciseVolume, getLoggedExercises } from "@/lib/db/queries/metrics";
import { getWeekReview } from "@/lib/db/queries/weekReview";
import { computePR } from "@/lib/db/queries/pr";
import { getLastPerformance } from "@/lib/db/queries/lastPerformance";
import { exportForAI } from "@/lib/plan/exportForAI";
import { exportAll, importMerge, resetAll } from "@/lib/db/backup";
import { weekStartKey } from "@/lib/utils/date";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
  await db.customExercises.clear();
});

const CAT = "chin-up"; // do catálogo, não está no plano

describe("exercícios criados pelo usuário", () => {
  it("cria com padrões: reps 3×8, segundos 3×20", async () => {
    const r = await createCustomExercise({ name: "Remada no anel", category: "Puxar", unit: "reps" });
    expect(r.id).toMatch(/^custom-/);
    expect([r.sets, r.target, r.rest, r.per_side]).toEqual([3, 8, 90, false]);
    const s = await createCustomExercise({ name: "Hold X", category: "Core", unit: "seconds" });
    expect([s.sets, s.target, s.rest]).toEqual([3, 20, 60]);
  });

  it("limpa o nome (espaços, tamanho) e recusa vazio", async () => {
    expect(cleanExerciseName("  Remada   no    anel ")).toBe("Remada no anel");
    expect(cleanExerciseName("x".repeat(200))).toHaveLength(CUSTOM_NAME_MAX);
    await expect(
      createCustomExercise({ name: "   ", category: "Puxar", unit: "reps" })
    ).rejects.toThrow();
  });

  it("nome repetido (caixa/acento) devolve o existente, sem duplicar", async () => {
    const a = await createCustomExercise({ name: "Extensão de punho", category: "Puxar", unit: "reps" });
    const b = await createCustomExercise({ name: "EXTENSAO  de punho", category: "Core", unit: "seconds" });
    expect(b.id).toBe(a.id);
    expect(await db.customExercises.count()).toBe(1);
  });

  it("valores absurdos são limitados", async () => {
    const r = await createCustomExercise({
      name: "Y",
      category: "Core",
      unit: "reps",
      sets: 999,
      target: -5,
      rest: 1,
    });
    expect([r.sets, r.target, r.rest]).toEqual([20, 1, 10]);
  });

  it("apagado (soft) some da lista mas o registro fica", async () => {
    const r = await createCustomExercise({ name: "Z", category: "Core", unit: "reps" });
    await deleteCustomExercise(r.id);
    expect(await getCustomExercises()).toEqual([]);
    expect((await db.customExercises.get(r.id))?.deleted_at).not.toBeNull();
  });

  it("lista ordenada por nome (pt-BR)", async () => {
    await createCustomExercise({ name: "Zebra", category: "Core", unit: "reps" });
    await createCustomExercise({ name: "Água", category: "Core", unit: "reps" });
    expect((await getCustomExercises()).map((c) => c.name)).toEqual(["Água", "Zebra"]);
  });

  it("aparece na busca unificada junto do catálogo", async () => {
    const r = await createCustomExercise({ name: "Remada no anel", category: "Puxar", unit: "reps" });
    const source = [...catalog, customToCatalogLike(r)];
    expect(searchCatalog("anel", {}, source).map((e) => e.id)).toContain(r.id);
    expect(searchCatalog("", { category: "Puxar" }, source).map((e) => e.id)).toContain(r.id);
  });
});

describe("acrescentar exercício ao treino", () => {
  it("guarda na ordem e é idempotente", async () => {
    const s = await createSession(1);
    await addExerciseToSession(s.id, CAT);
    await addExerciseToSession(s.id, "plank");
    await addExerciseToSession(s.id, CAT);
    expect((await getSession(s.id))?.added_exercises).toEqual([CAT, "plank"]);
  });

  it("só sessão em andamento aceita", async () => {
    const s = await createSession(1);
    await completeSession(s.id, 3, null);
    expect(await addExerciseToSession(s.id, CAT)).toBeNull();
    expect((await getSession(s.id))?.added_exercises ?? null).toBeNull();
    expect(await addExerciseToSession("nao-existe", CAT)).toBeNull();
  });

  it("remover: ok se ainda não registrado, recusa se já tem registro", async () => {
    const s = await createSession(1);
    await addExerciseToSession(s.id, CAT);
    await addExerciseToSession(s.id, "plank");
    expect(await removeAddedExercise(s.id, CAT)).toBe(true);
    expect((await getSession(s.id))?.added_exercises).toEqual(["plank"]);

    await upsertLog({
      session_id: s.id,
      exercise_id: "plank",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    expect(await removeAddedExercise(s.id, "plank")).toBe(false);
    expect((await getSession(s.id))?.added_exercises).toEqual(["plank"]);
  });

  it("remover o último zera a lista", async () => {
    const s = await createSession(1);
    await addExerciseToSession(s.id, CAT);
    await removeAddedExercise(s.id, CAT);
    expect((await getSession(s.id))?.added_exercises ?? null).toBeNull();
  });

  it("remover o que não foi adicionado devolve false", async () => {
    const s = await createSession(1);
    expect(await removeAddedExercise(s.id, CAT)).toBe(false);
  });
});

describe("resolveAddedExercise", () => {
  it("catálogo → exercício do plano com alvo e descanso do catálogo", () => {
    const ex = resolveAddedExercise("plank", [])!;
    expect(ex.name).toBe("Prancha");
    expect(ex.parsed).toEqual({ sets: 3, target: 30, unit: "seconds", per_side: false });
    expect(ex.rest).toBe("descanso 45s");
  });

  it("criado pelo usuário", async () => {
    const c = await createCustomExercise({ name: "Meu", category: "Core", unit: "reps" });
    expect(resolveAddedExercise(c.id, [c])?.name).toBe("Meu");
  });

  it("apagado sem snapshot → null; com snapshot → ainda resolve (histórico legível)", async () => {
    const c = await createCustomExercise({ name: "Meu", category: "Core", unit: "reps" });
    await deleteCustomExercise(c.id);
    const all = await db.customExercises.toArray();
    expect(resolveAddedExercise(c.id, all)).toBeNull();
    const snap = snapshotOf(templateToPlanExercise(customToTemplate(c)));
    expect(resolveAddedExercise(c.id, all, snap)?.name).toBe("Meu");
  });

  it("id desconhecido → null", () => {
    expect(resolveAddedExercise("nada", [])).toBeNull();
  });
});

describe("exercício adicionado entra nas métricas", () => {
  async function doAdded(id: string, sets: number[], extras: number[] = []) {
    const template = catalog.find((c) => c.id === id)!;
    const s = await createSession(1);
    await addExerciseToSession(s.id, id);
    await upsertLog({
      session_id: s.id,
      exercise_id: id,
      snapshot: snapshotOf(templateToPlanExercise(template)),
      as_target: false,
      sets: sets.map((value, index) => ({ index, value })),
      flags_selected: [],
      skipped: false,
    });
    for (const e of extras) await addExtraSet(s.id, id, e);
    await completeSession(s.id, 3, null);
    return s;
  }

  it("aparece no seletor de métricas com nome e unidade", async () => {
    await doAdded("plank", [30, 30, 25]);
    const list = await getLoggedExercises();
    expect(list).toContainEqual({ id: "plank", name: "Prancha", unit: "seconds" });
  });

  it("volume e volume semanal contam (incluindo série extra)", async () => {
    const s = await doAdded(CAT, [8, 8, 7], [5]);
    expect((await getExerciseVolume(CAT))[0].volume).toBe(8 + 8 + 7 + 5);
    expect((await getWeekReview(weekStartKey(s.date)))?.volume).toBe(28);
  });

  it("recorde é detectado contra o histórico do próprio exercício", async () => {
    await doAdded(CAT, [8, 8, 8]);
    const pr = await computePR(
      CAT,
      { as_target: false, sets: [{ index: 0, value: 10 }], skipped: false, flags_selected: [] },
      templateToPlanExercise(catalog.find((c) => c.id === CAT)!).parsed
    );
    expect(pr).toEqual({ value: 10, unit: "reps" });
  });

  it("'última performance' funciona entre sessões", async () => {
    await doAdded(CAT, [9, 8, 7]);
    const perf = await getLastPerformance(CAT);
    expect(perf.kind).toBe("sets");
    if (perf.kind === "sets") expect(perf.values).toEqual([9, 8, 7]);
  });

  it("export pra IA marca o exercício como adicionado, com o nome do snapshot", async () => {
    await doAdded(CAT, [8, 8, 8]);
    const { sessions } = await exportForAI();
    const ex = sessions[0].exercises.find((e) => e.name === "Chin-up (barra supinada)");
    expect(ex?.added).toBe(true);
    expect(ex?.performed).toEqual([8, 8, 8]);
  });

  it("exercício do plano não vem marcado como adicionado", async () => {
    const s = await createSession(1);
    await upsertLog({
      session_id: s.id,
      exercise_id: "pull-up-negativa-lenta",
      as_target: true,
      sets: null,
      flags_selected: [],
      skipped: false,
    });
    await completeSession(s.id, 3, null);
    const { sessions } = await exportForAI();
    expect("added" in sessions[0].exercises[0]).toBe(false);
  });
});

describe("backup e reset com exercícios criados", () => {
  it("export → limpar → import preserva criados e a lista de adicionados", async () => {
    const c = await createCustomExercise({ name: "Meu", category: "Core", unit: "reps" });
    const s = await createSession(1);
    await addExerciseToSession(s.id, c.id);
    await addExerciseToSession(s.id, CAT);
    const dump = await exportAll();

    await db.sessions.clear();
    await db.customExercises.clear();
    await importMerge(dump);

    expect((await getCustomExercises()).map((x) => x.id)).toEqual([c.id]);
    expect((await getSession(s.id))?.added_exercises).toEqual([c.id, CAT]);
  });

  it("backup antigo (sem customExercises/added_exercises) importa normalmente", async () => {
    const s = await createSession(1);
    const legacy = JSON.parse(JSON.stringify(await exportAll()));
    delete legacy.customExercises;
    delete legacy.sessions[0].added_exercises;
    await db.sessions.clear();
    await importMerge(legacy);
    expect((await getSession(s.id))?.added_exercises ?? null).toBeNull();
    expect(await getCustomExercises()).toEqual([]);
  });

  it("merge não sobrescreve criado local mais novo", async () => {
    const c = await createCustomExercise({ name: "Meu", category: "Core", unit: "reps" });
    const dump = await exportAll();
    await db.customExercises.update(c.id, { name: "Renomeado", updated_at: c.updated_at + 1000 });
    await importMerge(dump);
    expect((await db.customExercises.get(c.id))?.name).toBe("Renomeado");
  });

  it("'Deletar dados' também limpa os exercícios criados", async () => {
    await createCustomExercise({ name: "Meu", category: "Core", unit: "reps" });
    await resetAll();
    expect(await db.customExercises.count()).toBe(0);
  });
});
