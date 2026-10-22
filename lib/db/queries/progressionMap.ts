import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import { plan } from "@/lib/plan/loader";
import {
  exerciseSkillMapping,
  formatCriteria,
  getCriteria,
  getLevelInfo,
  getSkillById,
} from "@/lib/plan/skills";
import {
  READY_STREAK,
  positiveStreak,
  skillStateFromVotes,
  type SkillState,
} from "@/lib/domain/progressionState";
import {
  ackKeyExercise,
  ackKeySkill,
  ackedAt as storedAckAt,
} from "@/lib/utils/progressionAck";
import { genericVotes } from "./progressionReady";
import {
  sessionsRequiredFor,
  skillLogsFrom,
  skillVotes,
} from "./skillProgression";

/** "new" = o movimento ainda não foi registrado nenhuma vez. */
export type RowState = SkillState | "new";

export interface ProgressionRow {
  exerciseId: string;
  name: string;
  /** Rótulos dos treinos do plano em que o exercício aparece (A, B…). */
  workouts: string[];
  /** Alvo no plano vigente (do 1º treino em que aparece). */
  target: string;
  /** Degrau da escada a que o exercício está ligado, quando está. */
  skill: {
    id: string;
    name: string;
    level: number;
    steps: number;
    ladder: string;
    criteria: string | null;
    next: string | null;
  } | null;
  /** Estado do motor, ignorando dispensa. */
  state: RowState;
  /** O sinal (ready/regress) existe mas foi dispensado neste aparelho. */
  dismissed: boolean;
  /** Chave pra reativar o aviso dispensado. */
  ackKey: string;
  /** Sessões seguidas cumprindo o critério/alvo, e quantas o motor exige. */
  streak: number;
  required: number;
  /** Sessões que votaram (têm dado). */
  sessions: number;
  /** Data (dateKey) do último registro que votou. */
  lastDate: string | null;
}

/**
 * Estado de progressão de CADA exercício do plano vigente, numa passada só no
 * banco. O fim da sessão (`ProgressionNudge`) olha os exercícios de um treino; aqui
 * é o plano inteiro, então carregar sessões e logs uma vez e consultar em memória
 * é o que mantém a tela rápida com histórico longo.
 *
 * Usa as MESMAS funções do aviso de fim de sessão (`skillLogsFrom`, `genericVotes`,
 * `skillStateFromVotes`): o mapa nunca discorda do que a pessoa viu ao terminar.
 *
 * `ackedAt` é injetável pra teste; o padrão lê a dispensa do localStorage.
 */
export async function getProgressionMap(
  ackedAt: (key: string) => number | undefined = storedAckAt
): Promise<ProgressionRow[]> {
  const [logs, sessionRows]: [ExerciseLog[], Session[]] = await Promise.all([
    db.exerciseLogs.toArray(),
    db.sessions.toArray(),
  ]);
  const sessions = new Map(sessionRows.map((s) => [s.id, s]));

  // Um exercício por id, na ordem do plano, lembrando em que treinos ele aparece.
  const seen = new Map<
    string,
    { name: string; target: string; workouts: string[] }
  >();
  for (const workout of plan.workouts) {
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        const entry = seen.get(ex.id);
        if (!entry) {
          seen.set(ex.id, { name: ex.name, target: ex.target, workouts: [workout.label] });
        } else if (!entry.workouts.includes(workout.label)) {
          entry.workouts.push(workout.label);
        }
      }
    }
  }

  const rows: ProgressionRow[] = [];
  for (const [exerciseId, info] of seen) {
    const mapping = exerciseSkillMapping(exerciseId);
    const skillDef = mapping ? getSkillById(mapping.skill_id) : undefined;

    let state: RowState;
    let dismissed = false;
    let streak = 0;
    let required = READY_STREAK;
    let sessionsCount = 0;
    let lastDate: string | null = null;
    let ackKey: string;
    let skill: ProgressionRow["skill"] = null;

    if (mapping && skillDef) {
      ackKey = ackKeySkill(mapping.skill_id, mapping.level);
      required = sessionsRequiredFor(mapping.skill_id, mapping.level);
      const entries = skillLogsFrom(logs, sessions, mapping.skill_id, {
        level: mapping.level,
      });
      const votes = skillVotes(entries);
      const since = ackedAt(ackKey);
      const raw = skillStateFromVotes(votes, required);
      const effective = skillStateFromVotes(
        // Mesmo corte do `since` de skillLogsFrom, sem varrer os logs de novo.
        since === undefined
          ? votes
          : skillVotes(entries.filter((e) => e.log.logged_at > since)),
        required
      );
      state = votes.length === 0 ? "new" : raw;
      dismissed = (raw === "ready" || raw === "regress") && effective !== raw;
      streak = positiveStreak(votes);
      sessionsCount = votes.length;
      lastDate = entries.find((e) => e.log.criterion_met !== null)?.session.date ?? null;

      const idx = skillDef.steps.findIndex((s) => s.level === mapping.level);
      const criteria = getCriteria(mapping.skill_id, mapping.level);
      skill = {
        id: mapping.skill_id,
        name: skillDef.name,
        level: mapping.level,
        steps: skillDef.steps.length,
        ladder: getLevelInfo(mapping.skill_id, mapping.level)?.name ?? `nível ${mapping.level}`,
        criteria: criteria ? formatCriteria(criteria) : null,
        next:
          idx >= 0 && idx < skillDef.steps.length - 1 ? skillDef.steps[idx + 1].label : null,
      };
    } else {
      ackKey = ackKeyExercise(exerciseId);
      const all = genericVotes(exerciseId, logs, sessions);
      const since = ackedAt(ackKey);
      const rawReady = positiveStreak(all) >= READY_STREAK;
      const effReady =
        since === undefined
          ? rawReady
          : positiveStreak(genericVotes(exerciseId, logs, sessions, since)) >= READY_STREAK;
      state = all.length === 0 ? "new" : rawReady ? "ready" : "tracking";
      dismissed = rawReady && !effReady;
      streak = positiveStreak(all);
      sessionsCount = all.length;
      lastDate = all[0]?.date ?? null;
    }

    rows.push({
      exerciseId,
      name: info.name,
      workouts: info.workouts,
      target: info.target,
      skill,
      state,
      dismissed,
      ackKey,
      streak,
      required,
      sessions: sessionsCount,
      lastDate,
    });
  }
  return rows;
}

/** Linhas com sinal de subida ativo (pronto e não dispensado). */
export function readyRows(rows: ProgressionRow[]): ProgressionRow[] {
  return rows.filter((r) => r.state === "ready" && !r.dismissed);
}
