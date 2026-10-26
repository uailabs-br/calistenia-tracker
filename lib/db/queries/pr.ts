import { db, type ExerciseLog } from "@/lib/db/schema";
import type { Parsed } from "@/lib/plan/schema";
import { negFlagsOf } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { effectiveSets } from "@/lib/domain/volume";
import { unitOf } from "@/lib/domain/parseTarget";
import { isClean } from "./progressionReady";
import { getCompletedSessions, getLiveLogs, groupBySession } from "./sessions";

/** Métrica-rainha por unidade: maior série de reps ou maior hold único (segundos). */
export interface PRResult {
  value: number;
  unit: "reps" | "seconds";
  /** Melhor série limpa antes desta: a tela de recorde mostra o salto. */
  previous: number;
}

type LogLike = Pick<ExerciseLog, "as_target" | "sets" | "skipped" | "flags_selected"> &
  Partial<Pick<ExerciseLog, "extra_sets">>;

function maxSet(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

/** Formata o recorde para o toast (ex.: "18s", "6 reps"). */
export function formatPR(pr: PRResult): string {
  return pr.unit === "seconds" ? `${pr.value}s` : `${pr.value} reps`;
}

/**
 * Recorde no momento do registro. Compara a melhor série do log atual com o
 * melhor histórico LIMPO do movimento. Regras: só conta se limpo; 1ª vez não é
 * PR; empate não é PR; `attempts`/sem `parsed` não têm PR. `per_side` não muda a
 * comparação por série. Retorna null quando não é recorde.
 */
export async function computePR(
  exerciseId: string,
  currentLog: LogLike,
  parsed: Parsed | null
): Promise<PRResult | null> {
  if (currentLog.skipped || !parsed || parsed.unit === "attempts") return null;

  const negFlags = negFlagsOf(exerciseId);
  if (!isClean(currentLog, negFlags)) return null;

  const candidate = maxSet(effectiveSets(currentLog, parsed));
  if (candidate === null) return null;

  const sessions = (await db.sessions.toArray()).filter(
    (s) => s.status === "completed" && !s.deleted_at
  );

  let prevBest: number | null = null;
  for (const session of sessions) {
    const log = (
      await db.exerciseLogs.where("session_id").equals(session.id).toArray()
    ).find((l) => l.exercise_id === exerciseId && !l.deleted_at);
    if (!log || log.skipped || !isClean(log, negFlags)) continue;
    // alvo do dia em que foi feito (snapshot): mudar o plano não reescreve recorde
    const ex = resolveLogExercise(log, session.workout_id);
    const v = maxSet(effectiveSets(log, ex.parsed ?? parsed, ex.target));
    if (v !== null && (prevBest === null || v > prevBest)) prevBest = v;
  }

  if (prevBest === null) return null; // 1ª vez limpa não é recorde
  if (candidate <= prevBest) return null; // empate ou abaixo

  return { value: candidate, unit: parsed.unit, previous: prevBest };
}

export interface LatestRecord extends PRResult {
  exerciseId: string;
  name: string;
  date: string;
}

/**
 * O recorde mais recente do histórico, na mesma regra de `computePR` (só série
 * limpa, 1ª vez não conta, empate não conta). Recorde não fica gravado — é
 * calculado no registro —, então aqui o histórico é refeito em ordem: cada
 * sessão compara com o melhor de antes dela.
 */
export async function getLatestRecord(): Promise<LatestRecord | null> {
  const sessions = await getCompletedSessions();
  const logsBySession = groupBySession(await getLiveLogs());
  // Por exercício E unidade: um plano que troca reps por segundos não compara as duas.
  const best = new Map<string, number>();
  let latest: LatestRecord | null = null;

  for (const session of sessions) {
    for (const log of logsBySession.get(session.id) ?? []) {
      if (log.skipped || !isClean(log, negFlagsOf(log.exercise_id))) continue;
      const ex = resolveLogExercise(log, session.workout_id);
      const unit = unitOf(ex.parsed, ex.target);
      if (unit !== "reps" && unit !== "seconds") continue;
      const value = maxSet(effectiveSets(log, ex.parsed, ex.target));
      if (value === null) continue;
      const key = `${log.exercise_id}|${unit}`;
      const prev = best.get(key);
      if (prev !== undefined && value > prev) {
        latest = {
          exerciseId: log.exercise_id,
          name: ex.name ?? log.exercise_id,
          value,
          unit,
          previous: prev,
          date: session.date,
        };
      }
      if (prev === undefined || value > prev) best.set(key, value);
    }
  }
  return latest;
}
