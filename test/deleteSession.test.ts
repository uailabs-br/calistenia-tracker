import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/lib/db/schema";
import {
  createSession,
  completeSession,
  deleteSession,
  restoreSession,
} from "@/lib/db/repositories/sessions";
import { upsertLog, removeLog } from "@/lib/db/repositories/logs";
import { getCompletedSessions, getSessionDetail } from "@/lib/db/queries/sessions";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

async function treinoConcluido() {
  const s = await createSession("A");
  const base = { session_id: s.id, as_target: true, sets: null, flags_selected: [], skipped: false };
  await upsertLog({ ...base, exercise_id: "mu-completo" });
  await upsertLog({ ...base, exercise_id: "fl-tuck-raise" });
  await completeSession(s.id, 4, null);
  return s;
}

describe("apagar treino do histórico", () => {
  it("tira a sessão concluída e os registros dela do histórico", async () => {
    const s = await treinoConcluido();
    await deleteSession(s.id);

    expect(await getCompletedSessions()).toHaveLength(0);
    expect(await getSessionDetail(s.id)).toBeNull();
    const logs = await db.exerciseLogs.where("session_id").equals(s.id).toArray();
    expect(logs.every((l) => l.deleted_at)).toBe(true);
  });

  it("desfazer traz de volta a sessão e os registros, nada além", async () => {
    // relógio fixo: no mesmo milissegundo os dois apagamentos teriam o mesmo carimbo
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-28T17:30:00-03:00"));
    const s = await treinoConcluido();
    // exercício desfeito durante o treino: já estava apagado antes
    await removeLog(s.id, "fl-tuck-raise");

    vi.setSystemTime(new Date("2026-10-28T19:00:00-03:00"));
    const deletedAt = await deleteSession(s.id);
    await restoreSession(s.id, deletedAt);
    vi.useRealTimers();

    expect(await getCompletedSessions()).toHaveLength(1);
    const detail = await getSessionDetail(s.id);
    expect(detail?.logs.map((l) => l.exercise_id)).toEqual(["mu-completo"]);
  });
});
