/**
 * Onboarding: nível declarado → posição nas escadas de skill e escolha do
 * plano-semente. Puro: sem React, sem Dexie, sem localStorage.
 */

export type SeedId = "iniciante-sem-barra" | "iniciante-com-barra" | "intermediario";

export type Equipment = "chao" | "casa_barra" | "praca" | "academia";

/**
 * O que a pessoa quer, em uma palavra. Geral de propósito: o app tem 16 skills e
 * uma lista de objetivos por skill nunca cobriria todas (quem quer planche não
 * acharia a opção). A skill específica fica em Config → "Meus objetivos", que já
 * lista todas e vai pro prompt da IA; aqui só se diz a direção.
 *
 * Não entra na escolha da semente (são 3 planos generalistas; mudar a composição
 * por objetivo seria gerar treino, fora da tese) — vai pro `perfil_declarado` do
 * export, que é o que a IA lê pra escrever o próximo ciclo.
 */
export type Goal = "forca" | "resistencia" | "skills" | "mobilidade";

export const GOALS: Goal[] = ["forca", "resistencia", "skills", "mobilidade"];

/** Articulação que incomoda hoje. Autodeclarado, múltipla escolha, nunca filtra o plano. */
export type Limitation = "ombro" | "punho" | "cotovelo" | "joelho" | "lombar";

/**
 * Nível, definido pela escada do app (progressions.json) e não por contagem de
 * repetições: avançado em calistenia é quem já TEM skills, não quem faz mais
 * flexões. Autodeclarado — por isso cada nível grava a faixa BAIXA das
 * posições (ver LEVEL_POSITIONS).
 */
export type Level = "iniciante" | "intermediario" | "avancado";

export const LEVELS: Level[] = ["iniciante", "intermediario", "avancado"];

export interface OnboardingAnswers {
  equipment: Equipment;
  level: Level;
  goal?: Goal;
  limitations?: Limitation[];
  days_per_week: number;
}

/** Skills que o nível posiciona no mapa. Só as que o equipamento permite. */
export type LevelSkill = "push_up" | "pull_up" | "handstand_hold" | "dips";

const HAS_BAR: Equipment[] = ["casa_barra", "praca", "academia"];
const HAS_PARALLELS: Equipment[] = ["praca", "academia"];

export function hasBar(e: Equipment): boolean {
  return HAS_BAR.includes(e);
}

export function hasParallels(e: Equipment): boolean {
  return HAS_PARALLELS.includes(e);
}

/**
 * O que cada setup oferece. Uma semente serve se tudo que ela pede está aqui:
 * quem treina na praça também consegue fazer a semente que só usa o chão (ela
 * pede MENOS, não outra coisa).
 */
const TAGS: Record<Equipment, string[]> = {
  chao: ["chão", "parede"],
  casa_barra: ["chão", "parede", "barra"],
  praca: ["chão", "parede", "barra", "paralelas"],
  academia: ["chão", "parede", "barra", "paralelas"],
};

export function availableTags(e: Equipment): string[] {
  return TAGS[e];
}

export function seedFits(seedTags: readonly string[], e: Equipment): boolean {
  const have = new Set(TAGS[e]);
  return seedTags.every((t) => have.has(t));
}

/** Skills que fazem sentido pro equipamento, na ordem em que aparecem no resumo. */
export function levelSkillsFor(equipment: Equipment): LevelSkill[] {
  const keys: LevelSkill[] = ["push_up"];
  if (hasBar(equipment)) keys.push("pull_up");
  keys.push("handstand_hold");
  if (hasParallels(equipment)) keys.push("dips");
  return keys;
}

/**
 * Nível → índice (0-based) da etapa EM FOCO na escada, o mesmo que a página da
 * skill grava em `setSkillLevel`. Vale `índice = etapas que a pessoa já bate`.
 *
 * Cada nível grava a faixa BAIXA do que ele significa. A posição exibida é
 * `max(logs, manual)`: um palpite alto não é corrigido por nenhum treino depois,
 * um baixo se corrige no primeiro log limpo. Quem se superestima perde pouco;
 * quem acerta sobe sozinho.
 *
 * - iniciante: ainda constrói a base (flexão no chão < 10, sem pull-up 3×8).
 * - intermediario: pull-up 3×8, dip completo 3×8, diamante 3×10, handstand na
 *   parede 30s; está ENTRANDO em skill. Grava uma etapa abaixo do que isso
 *   implica (pull-up, dip, diamante e parede em foco).
 * - avancado: já tem skills (muscle-up estrito, handstand livre, ring dip).
 *   Grava archer push-up, archer pull-up, handstand livre e ring dip em foco.
 */
const LEVEL_POSITIONS: Record<Level, Record<LevelSkill, number>> = {
  iniciante: { push_up: 0, pull_up: 0, handstand_hold: 0, dips: 0 },
  intermediario: { push_up: 2, pull_up: 3, handstand_hold: 2, dips: 2 },
  avancado: { push_up: 3, pull_up: 5, handstand_hold: 5, dips: 3 },
};

/** { skillId: índice em foco } só das skills que o equipamento permite. */
export function mapAnswersToSkillLevels(a: OnboardingAnswers): Record<string, number> {
  const pos = LEVEL_POSITIONS[a.level];
  return Object.fromEntries(levelSkillsFor(a.equipment).map((k) => [k, pos[k]]));
}

/**
 * Semente sugerida (o usuário pode trocar). `intermediario` exige paralelas, que
 * é o equipamento da semente; quem tem só barra em casa fica na de iniciante,
 * que erra pra baixo.
 */
export function suggestSeed(a: Pick<OnboardingAnswers, "equipment" | "level">): SeedId {
  if (!hasBar(a.equipment)) return "iniciante-sem-barra";
  if (a.level !== "iniciante" && hasParallels(a.equipment)) return "intermediario";
  return "iniciante-com-barra";
}

/**
 * A pessoa está acima do que as sementes treinam? As sementes terminam no
 * "intermediario", então o avançado já tem skills que nenhuma delas treina. Sem
 * semente avançada pra oferecer (escrever uma é curadoria, não código), o que o
 * app faz é apontar a saída que ele já tem: importar um plano escrito por fora.
 */
export function aboveTopSeed(a: Pick<OnboardingAnswers, "level">): boolean {
  return a.level === "avancado";
}

/**
 * Semente aplicada quando a pessoa PULA o onboarding.
 *
 * Pular não é responder: o nível fica no menor. Mas o equipamento, se já foi
 * respondido, vale — aplicar a semente com barra pra quem acabou de marcar "só
 * o chão" entregava um plano que ele não tem como executar.
 */
export function skipSeed(s: { equipmentAnswered: boolean; equipment: Equipment }): SeedId {
  // Sem equipamento respondido não há o que inferir: cai no padrão do bundle
  // (DEFAULT_SEED_ID; `seeds.ts` importa deste módulo, não o contrário).
  if (!s.equipmentAnswered) return "iniciante-com-barra";
  return suggestSeed({ equipment: s.equipment, level: "iniciante" });
}

/**
 * Respostas gravadas antes da pergunta de nível tinham 4 perguntas de capacidade.
 * Convertidas aqui pra quem as fez não perder o que respondeu: o nível é o MAIOR
 * cuja faixa de posições a pessoa alcança em TODA skill perguntada. Exigir todas
 * erra pra baixo, que é o lado barato de errar.
 */
export interface LegacyAnswers {
  equipment: Equipment;
  push_up: "0" | "1-5" | "6-15" | "16+";
  pull_up?: "nunca" | "ainda_nao" | "1-2" | "3-7" | "8+";
  handstand_hold: "nunca" | "segundos" | "30s" | "solto";
  dips?: "nunca" | "pes_chao" | "completo" | "8+";
}

const LEGACY_INDEX = {
  push_up: { "0": 0, "1-5": 1, "6-15": 2, "16+": 3 },
  pull_up: { nunca: 0, ainda_nao: 1, "1-2": 3, "3-7": 4, "8+": 5 },
  handstand_hold: { nunca: 0, segundos: 2, "30s": 3, solto: 5 },
  dips: { nunca: 0, pes_chao: 1, completo: 2, "8+": 3 },
} as const;

export function levelFromLegacy(a: LegacyAnswers): Level {
  const had: Partial<Record<LevelSkill, number>> = {
    push_up: LEGACY_INDEX.push_up[a.push_up],
    handstand_hold: LEGACY_INDEX.handstand_hold[a.handstand_hold],
  };
  if (hasBar(a.equipment) && a.pull_up) had.pull_up = LEGACY_INDEX.pull_up[a.pull_up];
  if (hasParallels(a.equipment) && a.dips) had.dips = LEGACY_INDEX.dips[a.dips];
  const reaches = (level: Level) =>
    (Object.keys(had) as LevelSkill[]).every((k) => had[k]! >= LEVEL_POSITIONS[level][k]);
  return [...LEVELS].reverse().find(reaches) ?? "iniciante";
}

/** O onboarding só roda para quem ainda não tem nenhum rastro de uso. */
export function shouldRunOnboarding(s: {
  hasSessions: boolean;
  hasPlanOverride: boolean;
  onboardingDone: boolean;
}): boolean {
  return !s.hasSessions && !s.hasPlanOverride && !s.onboardingDone;
}

/**
 * `plan_day_id` é `${plan.id}:${workout_id}`. O id do plano é tudo antes do
 * ÚLTIMO ":" (o mesmo critério da migração Dexie v5).
 */
export function planIdFromPlanDayId(planDayId: string | null | undefined): string | null {
  if (!planDayId) return null;
  const i = planDayId.lastIndexOf(":");
  return i > 0 ? planDayId.slice(0, i) : null;
}
