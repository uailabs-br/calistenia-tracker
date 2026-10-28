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
import { plan } from "./loader";

/** As categorias na ordem de exibição (seletores, catálogo, backup). */
export const SKILL_CATEGORIES = ["Puxar", "Empurrar", "Core", "Pernas"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export interface SkillStep {
  label: string;
  /** nível na escada (1-indexed, casa com `progressions[].level` do catálogo). */
  level: number;
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
    5: "mu-completo",
  },
  // o 3 é o hold de uma perna do plano pessoal: sem ele, o objetivo de front
  // lever nunca anda (a campanha só lê nível com exercício mapeado)
  front_lever: { 1: "fl-tuck-hold", 2: "fl-adv-tuck-hold", 3: "fl-single-leg-hold" },
  // sem ele o skin the cat feito não aparece na escada do back lever
  back_lever: { 1: "skin-the-cat" },
  push_up: { 2: "push-up-com-pausa" },
  hspu: { 2: "hs-pike-pushup-elevado", 3: "hs-wall-hspu-negativa" },
  // v3.1: a negativa do frog saiu do nível 4 (sair da parede pela ponta do pé,
  // que é equilíbrio) e foi pra escada do press de braço flexionado, onde a
  // literatura põe o movimento.
  handstand_hold: {
    4: "hs-toe-pull",
    5: "hs-kickup-livre",
    6: "hs-kickup-controlado",
  },
  bent_arm_press: {
    2: "hs-frog-to-hs-negativa",
    3: "hs-frog-press",
    4: "hs-headstand-press",
  },
  // v3.1: escada realinhada à coluna de press de braço estendido do Overcoming
  // Gravity 2 (o tuck press saiu: de braço estendido ele é mais difícil que o
  // straddle, não mais fácil).
  press_handstand: {
    1: "press-compressao",
    2: "press-straddle-negativo",
    3: "press-straddle-elevado",
    4: "press-straddle",
    5: "press-pike",
  },
  l_sit: { 3: "core-l-sit-chao" },
  dragon_flag: { 4: "core-dragon-flag-negativa" },
  // v3.1: sem dips — o straight bar dip (fim do muscle-up) estava como "dip
  // completo" nas paralelas, e eram movimentos diferentes.
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
    level: p.level,
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

/**
 * Número por série que o critério exige (reps ou segundos), pra comparar com o
 * alvo do plano. Tentativas não têm: o critério é uma proporção, não um valor.
 */
export function criterionThreshold(criteria: Criteria): number | null {
  if (criteria.type === "reps_rir") return criteria.reps;
  if (criteria.type === "hold_clean") return criteria.duration_seconds;
  return null;
}

/** Texto curto do alvo numérico que o motor de progressão verifica de fato (não a técnica). */
export function formatCriteria(criteria: Criteria): string {
  const perSession =
    criteria.sessions_required > 1
      ? `${criteria.sessions_required} sessões seguidas`
      : "1 sessão";

  if (criteria.type === "reps_rir") {
    const side = criteria.unilateral ? " por lado" : "";
    return `${criteria.sets}×${criteria.reps} reps${side} · ${perSession}`;
  }

  if (criteria.type === "hold_clean") {
    const side = criteria.unilateral ? " por lado" : "";
    return `${criteria.sets}×${criteria.duration_seconds}s de hold limpo${side} · ${perSession}`;
  }

  const goodNeeded = Math.ceil(criteria.attempts * criteria.consistency_ratio);
  const hold = criteria.min_hold_seconds ? `, hold mín. ${criteria.min_hold_seconds}s` : "";
  return `${goodNeeded}/${criteria.attempts} tentativas boas${hold} · ${perSession}`;
}

/** Equipamento que o nível pede (chaves de progressions.json; qualquer um serve). */
export function getLevelEquipment(skillId: string, level: number): string[] {
  return (
    rawSkills.find((s) => s.id === skillId)?.progressions.find((p) => p.level === level)
      ?.equipment ?? []
  );
}

/** Nome + descrição de um nível de skill (para exibir o critério na UI). */
export function getLevelInfo(
  skillId: string,
  level: number
): { name: string; description: string } | undefined {
  const p = rawSkills.find((s) => s.id === skillId)?.progressions.find((p) => p.level === level);
  return p ? { name: p.name, description: p.description } : undefined;
}

/** Pontos de forma do nível (o que o critério chama de "limpo"), na ordem do catálogo. */
export function getLevelFlags(skillId: string, level: number): string[] {
  return (
    rawSkills.find((s) => s.id === skillId)?.progressions.find((p) => p.level === level)
      ?.form_flags ?? []
  );
}

export interface ExerciseSkillMapping {
  skill_id: string;
  level: number;
  criteria_type: Criteria["type"];
}

/** Lookup reverso LEGADO: exercise_id → skill/nível/tipo de critério. */
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

/**
 * `skill_ref` declarado no plano vigente, por exercise_id (1ª ocorrência).
 * Só entra quem declarou explicitamente: `null` = "este exercício NÃO é o nível
 * da escada" (evita atrelar, p.ex., um pistol squat ao nível Bulgarian).
 */
const PLAN_SKILL_REFS: Map<string, { skill_id: string; level: number } | null> = (() => {
  const map = new Map<string, { skill_id: string; level: number } | null>();
  for (const workout of plan.workouts) {
    for (const block of workout.blocks) {
      for (const ex of block.exercises) {
        if (ex.skill_ref === undefined || map.has(ex.id)) continue;
        map.set(ex.id, ex.skill_ref);
      }
    }
  }
  return map;
})();

/**
 * Exercício → nível de skill. O plano manda (`skill_ref`, inclusive `null`);
 * sem declaração, cai no mapeamento legado por id (`LEVEL_EXERCISE`).
 */
export function exerciseSkillMapping(exerciseId: string): ExerciseSkillMapping | null {
  if (PLAN_SKILL_REFS.has(exerciseId)) {
    const ref = PLAN_SKILL_REFS.get(exerciseId);
    if (!ref) return null;
    const criteria = getCriteria(ref.skill_id, ref.level);
    return criteria
      ? { skill_id: ref.skill_id, level: ref.level, criteria_type: criteria.type }
      : null;
  }
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
const WORKOUT_SKILL_TO_ID: Record<string, string> = {
  "Muscle Up": "muscle_up",
  MU: "muscle_up",
  "HS / Frog to HS": "handstand_hold",
  "Frog to HS": "handstand_hold",
  // rótulos das sementes (lib/plan/seeds/), em linguagem de iniciante
  Barra: "pull_up",
  "Flexão": "push_up",
  "Parada de mão": "handstand_hold",
  Dips: "dips",
  Agachamento: "pistol_squat",
};

export function skillIdForWorkout(daySkill: string): string | undefined {
  return WORKOUT_SKILL_TO_ID[daySkill];
}

/**
 * Rótulos de `workout.skill` que resolvem pra uma skill canônica. Exportado
 * porque o prompt da IA (lib/plan/aiSchema.ts) precisa listá-los: rótulo fora
 * daqui é só texto exibido, e o mapa de skills fica vazio sem a IA saber por quê.
 */
export const WORKOUT_SKILL_LABELS: string[] = Object.keys(WORKOUT_SKILL_TO_ID);
