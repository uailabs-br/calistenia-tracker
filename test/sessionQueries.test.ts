import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db/schema";
import {
  completeSession,
  createFreeformSession,
  createSession,
  softDeleteSession,
} from "@/lib/db/repositories/sessions";
import { removeLog, upsertLog } from "@/lib/db/repositories/logs";
import {
  getCompletedSessions,
  getCompletedSessionsOn,
  getLiveLogs,
  getSessionDetail,
  groupBySession,
  hadCompletedSession,
  hasLiveSessions,
} from "@/lib/db/queries/sessions";
import { localDateKey, shiftDays } from "@/lib/utils/date";

beforeEach(async () => {
  await db.sessions.clear();
  await db.exerciseLogs.clear();
});

const log = (session_id: string, exercise_id: string) =>
  upsertLog({
    session_id,
    exercise_id,
    as_target: true,
    sets: null,
    flags_selected: [],
    skipped: false,
  });

describe("queries de sessão", () => {
  it("getCompletedSessions: só concluídas e vivas, da mais antiga pra mais nova", async () => {
    const a = await createSession("A");
    await completeSession(a.id, 3, null);
    const ontem = await createFreeformSession(30, 1);
    await createSession("B"); // em andamento: fica de fora
    const apagada = await createSession("C");
    await completeSession(apagada.id, 3, null);
    await softDeleteSession(apagada.id);

    const rows = await getCompletedSessions();
    expect(rows.map((s) => s.id)).toEqual([ontem.id, a.id]);
  });

  it("getCompletedSessionsOn filtra pelo dia", async () => {
    const hoje = await createSession("A");
    await completeSession(hoje.id, 3, null);
    await createFreeformSession(undefined, 1);

    const rows = await getCompletedSessionsOn(localDateKey());
    expect(rows.map((s) => s.id)).toEqual([hoje.id]);
  });

  it("hadCompletedSession responde por dia, na ordem pedida", async () => {
    await createFreeformSession(undefined, 2);
    const ontem = shiftDays(localDateKey(), -1);
    const anteontem = shiftDays(localDateKey(), -2);
    expect(await hadCompletedSession([ontem, anteontem])).toEqual([false, true]);
  });

  it("hasLiveSessions ignora sessão apagada", async () => {
    expect(await hasLiveSessions()).toBe(false);
    const s = await createSession("A");
    expect(await hasLiveSessions()).toBe(true);
    await softDeleteSession(s.id);
    expect(await hasLiveSessions()).toBe(false);
  });

  it("getSessionDetail traz só os logs vivos e null pra sessão apagada", async () => {
    const s = await createSession("A");
    await log(s.id, "ex-1");
    await log(s.id, "ex-2");
    await removeLog(s.id, "ex-2");

    const detail = await getSessionDetail(s.id);
    expect(detail?.session.id).toBe(s.id);
    expect(detail?.logs.map((l) => l.exercise_id)).toEqual(["ex-1"]);

    await softDeleteSession(s.id);
    expect(await getSessionDetail(s.id)).toBeNull();
    expect(await getSessionDetail("nao-existe")).toBeNull();
  });

  it("groupBySession agrupa os logs vivos por sessão", async () => {
    const a = await createSession("A");
    const b = await createSession("B");
    await log(a.id, "ex-1");
    await log(a.id, "ex-2");
    await log(b.id, "ex-1");

    const groups = groupBySession(await getLiveLogs());
    expect(groups.get(a.id)?.length).toBe(2);
    expect(groups.get(b.id)?.length).toBe(1);
  });
});
