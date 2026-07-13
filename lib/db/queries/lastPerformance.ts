import { db } from "@/lib/db/schema";
import type { Parsed } from "@/lib/plan/schema";
import { effectiveSets } from "@/lib/domain/volume";
import { shortDate } from "@/lib/utils/date";

export type LastPerf =
  | { kind: "none" }
  | { kind: "as_target"; date: string }
  | { kind: "sets"; values: number[]; date: string }
  | { kind: "skipped"; date: string };

/**
 * Última performance de um exercício - centrada no MOVIMENTO, não no dia.
 * Como o mesmo ID é compartilhado entre dias, o histórico segue o exercício
 * (fazer o treino de terça na segunda mantém a continuidade).
 * `excludeSessionId` evita que a sessão em andamento conte como histórico.
 */
export async function getLastPerformance(
  exerciseId: string,
  excludeSessionId?: string
): Promise<LastPerf> {
  const sessions = (await db.sessions.toArray())
    .filter(
      (s) =>
        s.status === "completed" &&
        !s.deleted_at &&
        s.id !== excludeSessionId
    )
    .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));

  for (const session of sessions) {
    const log = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).find((l) => l.exercise_id === exerciseId && !l.deleted_at);
    if (!log) continue; // exercício não estava nessa sessão; tenta a anterior

    if (log.skipped) return { kind: "skipped", date: session.date };
    if (log.as_target) return { kind: "as_target", date: session.date };
    const values = effectiveSets(log, null);
    if (values.length > 0)
      return { kind: "sets", values, date: session.date };
    return { kind: "as_target", date: session.date };
  }
  return { kind: "none" };
}

/** Texto pronto para o card. */
export function formatLastPerf(perf: LastPerf, parsed: Parsed | null): string {
  switch (perf.kind) {
    case "none":
      return "primeira vez";
    case "as_target":
      return `como previsto · ${shortDate(perf.date)}`;
    case "skipped":
      return `pulado · ${shortDate(perf.date)}`;
    case "sets": {
      const unit = parsed?.unit === "seconds" ? "s" : "";
      return `${perf.values.map((v) => `${v}${unit}`).join("/")} · ${shortDate(
        perf.date
      )}`;
    }
  }
}
