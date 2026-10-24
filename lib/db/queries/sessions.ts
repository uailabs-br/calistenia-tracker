import { db, type Session, type ExerciseLog } from "@/lib/db/schema";

/**
 * Leituras básicas de sessões e registros, com o filtro de soft delete num lugar
 * só. As telas e as outras queries partem daqui em vez de repetir o
 * `!deleted_at` (esquecer ele ressuscita treino apagado).
 */

/** Treinos concluídos (plano + avulso), do mais antigo pro mais novo. */
export async function getCompletedSessions(): Promise<Session[]> {
  const rows = await db.sessions.where("status").equals("completed").toArray();
  return rows
    .filter((s) => !s.deleted_at)
    .sort((a, b) => (a.started_at ?? 0) - (b.started_at ?? 0));
}

/** Treinos concluídos num dia (dateKey). */
export async function getCompletedSessionsOn(date: string): Promise<Session[]> {
  const rows = await db.sessions.where("date").equals(date).toArray();
  return rows.filter((s) => s.status === "completed" && !s.deleted_at);
}

/** Pra cada dia pedido, se teve algum treino concluído (mesma ordem de `dates`). */
export async function hadCompletedSession(dates: string[]): Promise<boolean[]> {
  const rows = await db.sessions.where("date").anyOf(dates).toArray();
  const done = new Set(
    rows.filter((s) => s.status === "completed" && !s.deleted_at).map((s) => s.date)
  );
  return dates.map((date) => done.has(date));
}

/**
 * Se existe alguma sessão viva, em qualquer estado. É o que diz se a pessoa já
 * usou o app: contar as apagadas faria quem deletou tudo nunca mais ver o
 * onboarding.
 */
export async function hasLiveSessions(): Promise<boolean> {
  const rows = await db.sessions.toArray();
  return rows.some((s) => !s.deleted_at);
}

/** Uma sessão com os registros dela, pra tela de detalhe. null = não existe ou foi apagada. */
export async function getSessionDetail(
  id: string
): Promise<{ session: Session; logs: ExerciseLog[] } | null> {
  const session = await db.sessions.get(id);
  if (!session || session.deleted_at) return null;
  const logs = await db.exerciseLogs.where("session_id").equals(id).toArray();
  return { session, logs: logs.filter((l) => !l.deleted_at) };
}

/** Todos os registros vivos. */
export async function getLiveLogs(): Promise<ExerciseLog[]> {
  const rows = await db.exerciseLogs.toArray();
  return rows.filter((l) => !l.deleted_at);
}

/** Agrupa registros pela sessão (session_id → logs, na ordem de entrada). */
export function groupBySession(logs: ExerciseLog[]): Map<string, ExerciseLog[]> {
  const map = new Map<string, ExerciseLog[]>();
  for (const l of logs) {
    const arr = map.get(l.session_id);
    if (arr) arr.push(l);
    else map.set(l.session_id, [l]);
  }
  return map;
}
