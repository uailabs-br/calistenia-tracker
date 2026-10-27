import { db, type ExerciseLog, type Session } from "@/lib/db/schema";
import type { PlanExercise, Workout } from "@/lib/plan/schema";
import {
  exerciseSkillMapping,
  formatCriteria,
  getCriteria,
  getLevelFlags,
  getSkillById,
} from "@/lib/plan/skills";
import { positiveStreak, type Vote } from "@/lib/domain/progressionState";
import { rankCampaign, type CampaignItem } from "@/lib/domain/campaign";
import { sessionsRequiredFor, skillLogsFrom, skillVotes, type SkillLogEntry } from "./skillProgression";

/** Item da campanha visto do fim de uma sessão: a sequência antes dela e o voto dela. */
export interface SessionCampaignItem {
  item: CampaignItem;
  before: number;
  today: Vote | null;
}

interface Candidate {
  base: Omit<CampaignItem, "streak">;
  entries: SkillLogEntry[];
}

/**
 * Exercícios do treino que treinam um nível de algum objetivo, com os logs vivos
 * daquele nível. Os mesmos filtros do aviso de progressão (`skillLogsFrom`), pra
 * campanha e aviso nunca discordarem.
 */
async function candidates(workout: Workout, goals: string[]): Promise<Candidate[]> {
  const found: { exercise: PlanExercise; skillId: string; level: number }[] = [];
  for (const block of workout.blocks) {
    for (const exercise of block.exercises) {
      const mapping = exerciseSkillMapping(exercise.id);
      if (mapping && goals.includes(mapping.skill_id)) {
        found.push({ exercise, skillId: mapping.skill_id, level: mapping.level });
      }
    }
  }
  if (found.length === 0) return [];

  const [logs, sessionRows]: [ExerciseLog[], Session[]] = await Promise.all([
    db.exerciseLogs.where("skill_id").anyOf([...new Set(found.map((f) => f.skillId))]).toArray(),
    db.sessions.toArray(),
  ]);
  const sessions = new Map(sessionRows.map((s) => [s.id, s]));

  return found.flatMap(({ exercise, skillId, level }) => {
    const skill = getSkillById(skillId);
    if (!skill) return [];
    const criteria = getCriteria(skillId, level);
    return [
      {
        base: {
          skillId,
          skillName: skill.name,
          level,
          ladder: skill.steps.map((s) => s.label),
          criteria: criteria ? formatCriteria(criteria) : null,
          flags: getLevelFlags(skillId, level),
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          target: exercise.target,
          required: sessionsRequiredFor(skillId, level),
        },
        entries: skillLogsFrom(logs, sessions, skillId, { level }),
      },
    ];
  });
}

/** Objetivos que o treino move e onde cada um está (tela de carregamento, home). */
export async function getWorkoutCampaign(
  workout: Workout,
  goals: string[]
): Promise<CampaignItem[]> {
  if (goals.length === 0) return [];
  const found = await candidates(workout, goals);
  return rankCampaign(
    found.map((c) => ({ ...c.base, streak: positiveStreak(skillVotes(c.entries)) })),
    goals
  );
}

/**
 * A campanha no fim de uma sessão: a sequência de cada objetivo SEM a sessão
 * (é dela que a barra parte) e o voto da sessão. A ordem é a da tela de
 * carregamento, que também não via a sessão de hoje.
 */
export async function getSessionCampaign(
  workout: Workout,
  goals: string[],
  sessionId: string
): Promise<SessionCampaignItem[]> {
  if (goals.length === 0) return [];
  const found = await candidates(workout, goals);
  const extra = new Map<string, { today: Vote | null }>();
  const items = found.map((c) => {
    const before = positiveStreak(skillVotes(c.entries.filter((e) => e.session.id !== sessionId)));
    const today = skillVotes(c.entries.filter((e) => e.session.id === sessionId))[0] ?? null;
    extra.set(c.base.exerciseId, { today });
    return { ...c.base, streak: before };
  });
  return rankCampaign(items, goals).map((item) => ({
    item,
    before: item.streak,
    today: extra.get(item.exerciseId)?.today ?? null,
  }));
}
