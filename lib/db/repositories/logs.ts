import { db, type ExerciseLog, type SetPerformed, type SetValue } from "@/lib/db/schema";
import { exerciseSkillMapping, getCriteria } from "@/lib/plan/skills";
import { evaluateCriterion } from "@/lib/db/queries/skillProgression";
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
  sets_performed?: SetPerformed | null;
}

/**
 * Resolve os campos do motor de progressão v2 a partir do exercise_id e do
 * que foi declarado no registro. Exercício sem mapeamento (a maioria do
 * plano) → os 5 campos ficam null.
 */
function resolveSkillFields(input: LogInput): Pick<
  ExerciseLog,
  "skill_id" | "level_at_time" | "criteria_type" | "sets_performed" | "criterion_met"
> {
  const mapping = exerciseSkillMapping(input.exercise_id);
  if (!mapping) {
    return {
      skill_id: null,
      level_at_time: null,
      criteria_type: null,
      sets_performed: null,
      criterion_met: null,
    };
  }
  const performed = input.sets_performed ?? null;
  const criteria = getCriteria(mapping.skill_id, mapping.level);
  const criterionMet =
    performed && criteria ? evaluateCriterion(performed, criteria) : null;
  return {
    skill_id: mapping.skill_id,
    level_at_time: mapping.level,
    criteria_type: mapping.criteria_type,
    sets_performed: performed,
    criterion_met: criterionMet,
  };
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

  const skillFields = resolveSkillFields(input);

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
      ...skillFields,
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
    ...skillFields,
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
