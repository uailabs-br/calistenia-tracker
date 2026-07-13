import { db, type Session, type SessionStatus } from "@/lib/db/schema";
import { uuid, now } from "@/lib/utils/id";
import { localDateKey } from "@/lib/utils/date";
import { planDayId, plan } from "@/lib/plan/loader";

/** Toda escrita de Session passa por aqui (convenção: repositório único). */

export async function createSession(weekday: number): Promise<Session> {
  const ts = now();
  const session: Session = {
    id: uuid(),
    plan_day_id: planDayId(weekday),
    plan_version: plan.version,
    weekday,
    date: localDateKey(),
    status: "in_progress",
    started_at: ts,
    ended_at: null,
    rpe: null,
    note: null,
    updated_at: ts,
    deleted_at: null,
  };
  await db.sessions.add(session);
  return session;
}

export async function getSession(id: string): Promise<Session | undefined> {
  const s = await db.sessions.get(id);
  return s && !s.deleted_at ? s : undefined;
}

/** Sessão in_progress mais recente (para retomada). */
export async function getActiveSession(): Promise<Session | undefined> {
  const rows = await db.sessions
    .where("status")
    .equals("in_progress")
    .toArray();
  return rows
    .filter((s) => !s.deleted_at)
    .sort((a, b) => b.started_at - a.started_at)[0];
}

export async function completeSession(
  id: string,
  rpe: number,
  note: string | null
): Promise<void> {
  const ts = now();
  await db.sessions.update(id, {
    status: "completed" as SessionStatus,
    rpe,
    note: note && note.trim() ? note.trim() : null,
    ended_at: ts,
    updated_at: ts,
  });
}

export async function abandonSession(id: string): Promise<void> {
  const ts = now();
  await db.sessions.update(id, {
    status: "abandoned" as SessionStatus,
    ended_at: ts,
    updated_at: ts,
  });
}

/** Soft delete (tombstone). Nunca delete físico. */
export async function softDeleteSession(id: string): Promise<void> {
  const ts = now();
  await db.sessions.update(id, { deleted_at: ts, updated_at: ts });
}

/**
 * Descarta uma sessão em andamento sem salvar o progresso: soft-delete da
 * sessão e de todos os seus registros de exercício. Some do "ativo",
 * do histórico e das métricas.
 */
export async function discardSession(id: string): Promise<void> {
  const ts = now();
  await db.transaction("rw", db.sessions, db.exerciseLogs, async () => {
    const logs = await db.exerciseLogs
      .where("session_id")
      .equals(id)
      .toArray();
    for (const l of logs) {
      if (!l.deleted_at) {
        await db.exerciseLogs.update(l.id, { deleted_at: ts, updated_at: ts });
      }
    }
    await db.sessions.update(id, { deleted_at: ts, updated_at: ts });
  });
}
