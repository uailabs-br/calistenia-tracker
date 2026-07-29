import { db, type SetPerformed } from "@/lib/db/schema";
import { getCriteria, type Criteria } from "@/lib/plan/skills";

/**
 * Avalia se uma performance declarada bate o critério estruturado do nível.
 * Pura — não acessa o banco. Tipo incompatível (performed.type !== criteria.type)
 * é defensivo: nunca deveria acontecer (resolveSkillFields casa os dois pelo
 * mesmo exerciseSkillMapping), mas retorna false em vez de lançar.
 */
export function evaluateCriterion(performed: SetPerformed, criteria: Criteria): boolean {
  if (performed.type !== criteria.type) return false;

  if (performed.type === "reps_rir" && criteria.type === "reps_rir") {
    return (
      performed.reps.length >= criteria.sets &&
      performed.reps.every((r) => r >= criteria.reps) &&
      performed.rir <= criteria.rir_max &&
      performed.form_ok
    );
  }

  if (performed.type === "hold_clean" && criteria.type === "hold_clean") {
    return (
      performed.durations_seconds.length >= criteria.sets &&
      performed.durations_seconds.every((d) => d >= criteria.duration_seconds) &&
      performed.form_ok
    );
  }

  if (performed.type === "skill_consistency" && criteria.type === "skill_consistency") {
    // min_hold_seconds (quando presente) não é re-verificável a partir dos
    // contadores agregados — confia que a UI só incrementa attempts_good
    // quando o hold mínimo foi atingido.
    return (
      performed.attempts_total > 0 &&
      performed.attempts_good / performed.attempts_total >= criteria.consistency_ratio
    );
  }

  return false;
}

export type SkillState = "ready" | "regress" | "stale" | "tracking";

const REGRESS_STREAK = 3; // schema_notes.advancement_logic: "falha em 3 sessões consecutivas sugere regressão"
const STALE_SESSIONS = 8; // definição fixada na proposta original

/**
 * Estado de progressão de um skill num nível: lê os logs mapeados a esse
 * skill+nível, ordena por sessão mais recente e aplica a máquina de estados.
 * "ready"/"regress" seguem o critério do próprio nível (sessions_required);
 * "stale" é um teto de sessões sem decisão, pra não ficar preso pra sempre
 * em "tracking".
 */
export async function getSkillState(
  skillId: string,
  level: number,
  sessionsRequired?: number
): Promise<SkillState> {
  const criteria = getCriteria(skillId, level);
  const required = sessionsRequired ?? criteria?.sessions_required ?? 2;

  const logs = (
    await db.exerciseLogs
      .where("skill_id")
      .equals(skillId)
      .and((l) => l.level_at_time === level && !l.deleted_at && !l.skipped)
      .toArray()
  ).filter((l) => l.criterion_met !== null);

  if (logs.length === 0) return "tracking";

  const sessions = await db.sessions.toArray();
  const startedAt = new Map(sessions.map((s) => [s.id, s.started_at ?? 0]));

  const ordered = logs
    .slice()
    .sort((a, b) => (startedAt.get(b.session_id) ?? 0) - (startedAt.get(a.session_id) ?? 0));

  let positiveStreak = 0;
  for (const log of ordered) {
    if (!log.criterion_met) break;
    positiveStreak++;
  }
  if (positiveStreak >= required) return "ready";

  let negativeStreak = 0;
  for (const log of ordered) {
    if (log.criterion_met) break;
    negativeStreak++;
  }
  if (negativeStreak >= REGRESS_STREAK) return "regress";

  if (ordered.length >= STALE_SESSIONS) return "stale";

  return "tracking";
}
