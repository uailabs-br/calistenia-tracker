import { db, type Session, type SessionStatus } from "@/lib/db/schema";
import { uuid, now } from "@/lib/utils/id";
import { localDateKey, shiftDays } from "@/lib/utils/date";
import { planDayId, plan } from "@/lib/plan/loader";

/** Toda escrita de Session passa por aqui (convenção: repositório único). */

export async function createSession(workoutId: string): Promise<Session> {
  const ts = now();
  const session: Session = {
    id: uuid(),
    plan_day_id: planDayId(workoutId),
    plan_version: plan.version,
    workout_id: workoutId,
    date: localDateKey(),
    status: "in_progress",
    started_at: ts,
    ended_at: null,
    rpe: null,
    note: null,
    source: "plan",
    updated_at: ts,
    deleted_at: null,
  };
  await db.sessions.add(session);
  return session;
}

/**
 * Treino avulso: registra que treinou fora do programa, hoje ou em um dos
 * últimos dias (`daysAgo`, 0-2 — cobre esquecer de registrar no dia). Já
 * nasce completo (não passa por in_progress) — `durationMinutes` é uma
 * estimativa opcional informada pelo usuário, nunca medida ao vivo.
 */
export async function createFreeformSession(
  durationMinutes?: number,
  daysAgo = 0
): Promise<Session> {
  const ts = now();
  const date = daysAgo > 0 ? shiftDays(localDateKey(), -daysAgo) : localDateKey();
  // Sessão de dia passado: âncora no meio-dia daquela data (evita "ended_at"
  // no futuro ou timestamps sem sentido); sessão de hoje usa o instante real.
  const anchor = daysAgo > 0 ? new Date(date + "T12:00:00").getTime() : ts;
  const durationMs =
    durationMinutes && durationMinutes > 0 ? durationMinutes * 60_000 : 0;
  const session: Session = {
    id: uuid(),
    plan_day_id: null,
    plan_version: plan.version,
    workout_id: null,
    date,
    status: "completed",
    started_at: anchor - durationMs,
    ended_at: anchor,
    rpe: null,
    note: null,
    source: "freeform",
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

/**
 * `workout_id` do último treino do PLANO concluído: é ele que define o próximo
 * da sequência. Avulso não entra; sessão em andamento também não. null = nunca treinou.
 */
export async function getLastPlanWorkoutId(): Promise<string | null> {
  const rows = await db.sessions.where("status").equals("completed").toArray();
  const last = rows
    .filter((s) => !s.deleted_at && s.source === "plan" && s.workout_id)
    .sort((a, b) => b.started_at - a.started_at)[0];
  return last?.workout_id ?? null;
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
 * Acrescenta um exercício (catálogo ou criado pelo usuário) ao treino em
 * andamento. Idempotente; só sessão `in_progress`. Devolve a sessão atualizada
 * ou null se não der pra acrescentar.
 */
export async function addExerciseToSession(
  session_id: string,
  exercise_id: string
): Promise<Session | null> {
  const s = await db.sessions.get(session_id);
  if (!s || s.deleted_at || s.status !== "in_progress") return null;
  const list = s.added_exercises ?? [];
  if (list.includes(exercise_id)) return s;
  const updated: Session = {
    ...s,
    added_exercises: [...list, exercise_id],
    updated_at: now(),
  };
  await db.sessions.put(updated);
  return updated;
}

/**
 * Tira do treino um exercício acrescentado que ainda não foi registrado.
 * Se já tem registro, recusa (false): o registro é histórico e não some sozinho.
 */
export async function removeAddedExercise(
  session_id: string,
  exercise_id: string
): Promise<boolean> {
  const s = await db.sessions.get(session_id);
  if (!s || s.deleted_at || !(s.added_exercises ?? []).includes(exercise_id)) return false;
  const hasLog = (
    await db.exerciseLogs.where("session_id").equals(session_id).toArray()
  ).some((l) => l.exercise_id === exercise_id && !l.deleted_at);
  if (hasLog) return false;
  const rest = (s.added_exercises ?? []).filter((id) => id !== exercise_id);
  await db.sessions.put({
    ...s,
    added_exercises: rest.length > 0 ? rest : null,
    updated_at: now(),
  });
  return true;
}

/**
 * Grava as séries já feitas de um exercício ainda sem log (série a série).
 * `values` vazio ou null limpa a entrada. Só sessão `in_progress`: depois de
 * concluída, série parcial não tem mais pra onde ir. Devolve a sessão atualizada.
 */
export async function setPartialSets(
  session_id: string,
  exercise_id: string,
  values: number[] | null
): Promise<Session | null> {
  const s = await db.sessions.get(session_id);
  if (!s || s.deleted_at || s.status !== "in_progress") return null;
  const map = { ...(s.partial_sets ?? {}) };
  if (values && values.length > 0) map[exercise_id] = values;
  else delete map[exercise_id];
  const updated: Session = {
    ...s,
    partial_sets: Object.keys(map).length > 0 ? map : null,
    updated_at: now(),
  };
  await db.sessions.put(updated);
  return updated;
}

/**
 * Descarta uma sessão em andamento sem salvar o progresso: soft-delete da
 * sessão e de todos os seus registros de exercício. Some do "ativo",
 * do histórico e das métricas.
 */
export async function discardSession(id: string): Promise<void> {
  await deleteSession(id);
}

/**
 * Apaga um treino do histórico (concluído ou não): soft-delete da sessão e dos
 * registros dela, no mesmo carimbo. Devolve o carimbo, que é o que
 * `restoreSession` usa pra desfazer.
 */
export async function deleteSession(id: string): Promise<number> {
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
  return ts;
}

/**
 * Desfaz `deleteSession`. Só volta o que saiu naquele carimbo: um registro
 * apagado antes (exercício desfeito durante o treino) continua apagado.
 */
export async function restoreSession(id: string, deletedAt: number): Promise<void> {
  const ts = now();
  await db.transaction("rw", db.sessions, db.exerciseLogs, async () => {
    const logs = await db.exerciseLogs
      .where("session_id")
      .equals(id)
      .toArray();
    for (const l of logs) {
      if (l.deleted_at === deletedAt) {
        await db.exerciseLogs.update(l.id, { deleted_at: null, updated_at: ts });
      }
    }
    await db.sessions.update(id, { deleted_at: null, updated_at: ts });
  });
}
