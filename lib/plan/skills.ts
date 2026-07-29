/**
 * Catálogo canônico de skills de calistenia — derivado de `progressions.json`
 * (Overcoming Gravity, BWF Wiki, Gymnastic Bodies, GMB), desacoplado dos dias de
 * treino. Cada skill é uma escada ordenada (a última etapa é a própria skill).
 *
 * A posição do usuário na escada é derivada dos logs: um nível pode apontar um
 * `exercise_id` do plano (via `LEVEL_EXERCISE`) e é dado como concluído quando há
 * um sucesso limpo desse exercício. Níveis sem exercício são marcos canônicos sem
 * detecção automática, mas contam como concluídos quando um nível posterior
 * mapeado já foi atingido.
 */

import progressionsData from "./progressions.json";

export type SkillCategory = "Puxar" | "Empurrar" | "Core" | "Pernas";

export interface SkillStep {
  label: string;
  /** exercício do plano que evidencia a etapa (opcional). */
  exercise_id?: string;
  /** o que é o movimento nesta etapa. */
  criteria?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  steps: SkillStep[];
}

const GROUP_TO_CATEGORY: Record<string, SkillCategory> = {
  pull: "Puxar",
  push: "Empurrar",
  core: "Core",
  legs: "Pernas",
};

/**
 * Exercícios do plano que evidenciam um nível de uma skill (skillId → nível →
 * exercise_id). Só os níveis presentes no plano têm detecção automática.
 */
const LEVEL_EXERCISE: Record<string, Record<number, string>> = {
  // v1→v3: escadas foram renumeradas (níveis inseridos/removidos); os
  // números abaixo são os níveis da v3, não os da v1.
  pull_up: { 2: "row-inverso-barra-baixa", 4: "pull-up-peso-morto" },
  muscle_up: {
    1: "mu-puxada-explosiva",
    2: "mu-false-grip-pullup",
    3: "mu-negativa-transicao",
    4: "mu-jumping-barra-baixa",
  },
  front_lever: { 1: "fl-tuck-hold" },
  push_up: { 2: "push-up-com-pausa" },
  hspu: { 2: "hs-pike-pushup-elevado" },
  handstand_hold: {
    4: "hs-frog-to-hs-negativa",
    5: "hs-kickup-livre",
    6: "hs-kickup-controlado",
  },
  l_sit: { 3: "core-l-sit-chao" },
  dragon_flag: { 4: "core-dragon-flag-negativa" },
  dips: { 3: "mu-straight-bar-dip" },
  pistol_squat: { 2: "legs-pistol-split-squat" },
};

export type Criteria =
  | {
      type: "reps_rir";
      sets: number;
      reps: number;
      rir_max: number;
      unilateral?: boolean;
      sessions_required: number;
    }
  | {
      type: "hold_clean";
      sets: number;
      duration_seconds: number;
      unilateral?: boolean;
      sessions_required: number;
    }
  | {
      type: "skill_consistency";
      sets: number;
      attempts: number;
      consistency_ratio: number;
      min_hold_seconds?: number;
      sessions_required: number;
    };

interface RawProgression {
  level: number;
  name: string;
  description: string;
  criteria: Criteria;
  form_flags: string[];
  accessories: { name: string; volume_target: Record<string, number>; rationale: string }[];
  equipment: string[];
  video_reference: string | null;
}
interface RawSkill {
  id: string;
  name: string;
  group: string;
  source: string;
  equipment_required: string[];
  equipment_alternatives: Record<string, string>;
  prerequisites?: { skill_id: string; min_level: number }[];
  progressions: RawProgression[];
}

export const skills: Skill[] = (
  progressionsData.skills as unknown as RawSkill[]
).map((s) => ({
  id: s.id,
  name: s.name,
  category: GROUP_TO_CATEGORY[s.group] ?? "Puxar",
  steps: s.progressions.map((p) => ({
    label: p.name,
    criteria: p.description,
    exercise_id: LEVEL_EXERCISE[s.id]?.[p.level],
  })),
}));

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}

const rawSkills = progressionsData.skills as unknown as RawSkill[];

/** Critério estruturado de um nível de skill (para o motor de progressão). */
export function getCriteria(skillId: string, level: number): Criteria | undefined {
  return rawSkills
    .find((s) => s.id === skillId)
    ?.progressions.find((p) => p.level === level)?.criteria;
}

/** Nome + descrição de um nível de skill (para exibir o critério na UI). */
export function getLevelInfo(
  skillId: string,
  level: number
): { name: string; description: string } | undefined {
  const p = rawSkills.find((s) => s.id === skillId)?.progressions.find((p) => p.level === level);
  return p ? { name: p.name, description: p.description } : undefined;
}

export interface ExerciseSkillMapping {
  skill_id: string;
  level: number;
  criteria_type: Criteria["type"];
}

/** Lookup reverso: exercise_id do plano → skill/nível/tipo de critério. */
const EXERCISE_TO_SKILL: Record<string, ExerciseSkillMapping> = Object.fromEntries(
  Object.entries(LEVEL_EXERCISE).flatMap(([skillId, levels]) =>
    Object.entries(levels).map(([level, exerciseId]) => {
      const criteria = getCriteria(skillId, Number(level));
      return [
        exerciseId,
        { skill_id: skillId, level: Number(level), criteria_type: criteria!.type },
      ];
    })
  )
);

export function exerciseSkillMapping(exerciseId: string): ExerciseSkillMapping | null {
  return EXERCISE_TO_SKILL[exerciseId] ?? null;
}

/** Todos os exercise_ids referenciados nas escadas (para consultar os logs). */
export function skillStepExerciseIds(): string[] {
  return [
    ...new Set(
      skills.flatMap((s) =>
        s.steps.map((st) => st.exercise_id).filter((id): id is string => Boolean(id))
      )
    ),
  ];
}

/** Mapeia o rótulo de skill de um dia do plano para a skill canônica. */
const DAY_SKILL_TO_ID: Record<string, string> = {
  "Muscle Up": "muscle_up",
  MU: "muscle_up",
  "HS / Frog to HS": "handstand_hold",
  "Frog to HS": "handstand_hold",
};

export function skillIdForDay(daySkill: string): string | undefined {
  return DAY_SKILL_TO_ID[daySkill];
}
