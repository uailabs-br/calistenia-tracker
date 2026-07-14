import { db, type ExerciseLog, type SetValue } from "@/lib/db/schema";
import { uuid, now } from "@/lib/utils/id";

/** Toda escrita de ExerciseLog passa por aqui. */

interface LogInput {
  session_id: string;
  exercise_id: string;
  as_target: boolean;
  sets: SetValue[] | null;
  flags_selected: string[];
  note?: string | null;
  skipped: boolean;
}

/**
 * Grava (ou regrava) o log de um exercício numa sessão.
 * Idempotente por (session_id, exercise_id): se já existe, atualiza.
 */
export async function upsertLog(input: LogInput): Promise<ExerciseLog> {
  const ts = now();
  const existing = await db.exerciseLogs
    .where("session_id")
    .equals(input.session_id)
    .filter((l) => l.exercise_id === input.exercise_id && !l.deleted_at)
    .first();

  if (existing) {
    const updated: ExerciseLog = {
      ...existing,
      as_target: input.as_target,
      sets: input.sets,
      flags_selected: input.flags_selected,
      note: input.note ?? null,
      skipped: input.skipped,
      logged_at: ts,
      updated_at: ts,
    };
    await db.exerciseLogs.put(updated);
    return updated;
  }

  const log: ExerciseLog = {
    id: uuid(),
    session_id: input.session_id,
    exercise_id: input.exercise_id,
    as_target: input.as_target,
    sets: input.sets,
    flags_selected: input.flags_selected,
    note: input.note ?? null,
    skipped: input.skipped,
    logged_at: ts,
    updated_at: ts,
    deleted_at: null,
  };
  await db.exerciseLogs.add(log);
  return log;
}

/** Remove (soft) o log de um exercício - usado ao desmarcar. */
export async function removeLog(
  session_id: string,
  exercise_id: string
): Promise<void> {
  const ts = now();
  const existing = await db.exerciseLogs
    .where("session_id")
    .equals(session_id)
    .filter((l) => l.exercise_id === exercise_id && !l.deleted_at)
    .first();
  if (existing) {
    await db.exerciseLogs.update(existing.id, {
      deleted_at: ts,
      updated_at: ts,
    });
  }
}

export async function getLogsForSession(
  session_id: string
): Promise<ExerciseLog[]> {
  const rows = await db.exerciseLogs
    .where("session_id")
    .equals(session_id)
    .toArray();
  return rows.filter((l) => !l.deleted_at);
}
