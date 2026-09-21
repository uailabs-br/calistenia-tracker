import { db, type ExerciseLog, type Session, type SetPerformed } from "@/lib/db/schema";
import { exerciseSkillMapping, getCriteria, type Criteria } from "@/lib/plan/skills";
import { negFlagsOf } from "@/lib/plan/loader";
import { resolveLogExercise } from "@/lib/plan/resolve";
import { hitTarget, isClean } from "./progressionReady";

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
      // RIR não declarado (a UI não o coleta mais): avalia só reps e forma
      (performed.rir === null || performed.rir <= criteria.rir_max) &&
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

export interface SkillLogEntry {
  log: ExerciseLog;
  session: Session;
}

/**
 * Logs "vivos" de uma skill, do mais recente pro mais antigo. Só conta o que
 * ainda faz sentido HOJE:
 * - sessão existente, não apagada, concluída ou em andamento (abandonada não);
 * - exercício que o plano vigente ainda vincula àquela skill/nível (log de um
 *   exercício que saiu do plano, ou foi re-vinculado, não pesa mais);
 * - opcionalmente só o que veio depois de `since` (dispensa do aviso).
 */
export async function getSkillLogs(
  skillId: string,
  opts: { level?: number; since?: number } = {}
): Promise<SkillLogEntry[]> {
  const logs = await db.exerciseLogs.where("skill_id").equals(skillId).toArray();
  const sessions = new Map((await db.sessions.toArray()).map((s) => [s.id, s]));

  const out: SkillLogEntry[] = [];
  for (const log of logs) {
    if (log.deleted_at || log.skipped) continue;
    if (opts.level !== undefined && log.level_at_time !== opts.level) continue;
    if (opts.since !== undefined && log.logged_at <= opts.since) continue;
    const session = sessions.get(log.session_id);
    if (!session || session.deleted_at) continue;
    if (session.status !== "completed" && session.status !== "in_progress") continue;
    const mapping = exerciseSkillMapping(log.exercise_id);
    if (!mapping || mapping.skill_id !== skillId || mapping.level !== log.level_at_time) {
      continue;
    }
    out.push({ log, session });
  }
  return out.sort(
    (a, b) =>
      b.session.started_at - a.session.started_at || b.log.logged_at - a.log.logged_at
  );
}

/**
 * Falha "de verdade": não cumpriu o que o PLANO pediu (alvo do dia do registro)
 * ou executou sujo. Ficar abaixo do critério da escada mas dentro do plano é só
 * "ainda não é hora de subir" — não conta como sinal de regressão.
 */
function isRealFailure({ log, session }: SkillLogEntry): boolean {
  const target = resolveLogExercise(log, session.weekday).parsed?.target ?? null;
  return !(hitTarget(log, target) && isClean(log, negFlagsOf(log.exercise_id)));
}

/**
 * Estado de progressão de um skill num nível: lê os logs mapeados a esse
 * skill+nível, ordena por sessão mais recente e aplica a máquina de estados.
 * "ready"/"regress" seguem o critério do próprio nível (sessions_required);
 * "stale" é um teto de sessões sem decisão, pra não ficar preso pra sempre
 * em "tracking". `since` ignora tudo até a última dispensa do aviso.
 */
export async function getSkillState(
  skillId: string,
  level: number,
  sessionsRequired?: number,
  since?: number
): Promise<SkillState> {
  const criteria = getCriteria(skillId, level);
  const required = sessionsRequired ?? criteria?.sessions_required ?? 2;

  // sem `criterion_met` (sem sets_performed) o log não vota nem a favor nem contra
  const ordered = (await getSkillLogs(skillId, { level, since })).filter(
    (e) => e.log.criterion_met !== null
  );
  if (ordered.length === 0) return "tracking";

  let positiveStreak = 0;
  for (const e of ordered) {
    if (!e.log.criterion_met) break;
    positiveStreak++;
  }
  if (positiveStreak >= required) return "ready";

  let negativeStreak = 0;
  for (const e of ordered) {
    if (e.log.criterion_met || !isRealFailure(e)) break;
    negativeStreak++;
  }
  if (negativeStreak >= REGRESS_STREAK) return "regress";

  if (ordered.length >= STALE_SESSIONS) return "stale";

  return "tracking";
}
