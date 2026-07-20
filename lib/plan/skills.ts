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
  pull_up: { 5: "pull-up-peso-morto" },
  muscle_up: {
    1: "mu-puxada-explosiva",
    2: "mu-negativa-transicao",
    3: "mu-jumping-barra-baixa",
  },
  front_lever: { 1: "fl-tuck-hold" },
  push_up: { 3: "push-up-com-pausa" },
  hspu: { 2: "hs-pike-pushup-elevado" },
  handstand_hold: { 5: "hs-kickup-livre", 6: "hs-kickup-controlado" },
  l_sit: { 3: "core-l-sit-chao" },
  dragon_flag: { 3: "core-dragon-flag-negativa" },
  pistol_squat: { 2: "legs-pistol-split-squat" },
};

interface RawProgression {
  level: number;
  name: string;
  description: string;
}
interface RawSkill {
  id: string;
  name: string;
  group: string;
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
