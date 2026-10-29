/**
 * Onboarding: nível declarado → posição nas escadas de skill e escolha do
 * plano-semente. Puro: sem React, sem Dexie, sem localStorage.
 */

export type SeedId =
  | "iniciante-sem-barra"
  | "iniciante-com-barra"
  | "intermediario"
  | "iniciante-corpo-inteiro-sem-barra"
  | "iniciante-corpo-inteiro-com-barra"
  | "intermediario-sem-barra"
  | "intermediario-com-barra";

/**
 * O que a pessoa tem pra treinar, além do chão e da porta (que todo mundo tem).
 * Antes era o LUGAR (chão, casa com barra, praça, academia), e o lugar decidia o
 * equipamento: "praça" assumia paralelas, e uma praça só com barra recebia o
 * plano intermediário, que depende delas. Agora o lugar só pré-marca a lista.
 */
export type GearItem =
  | "parede"
  | "barra"
  | "paralelas"
  | "banco"
  | "argolas"
  | "paralettes"
  | "elastico"
  | "peso";

export const GEAR_ITEMS: GearItem[] = [
  "parede",
  "barra",
  "paralelas",
  "banco",
  "argolas",
  "paralettes",
  "elastico",
  "peso",
];

export type Equipment = readonly GearItem[];

/** Atalho da pergunta: tocar no lugar pré-marca a lista, e a pessoa tira o que não tem. */
export type Place = "casa" | "praca" | "academia";

export const PLACE_GEAR: Record<Place, GearItem[]> = {
  casa: ["parede"],
  praca: ["parede", "barra", "paralelas", "banco"],
  academia: ["parede", "barra", "paralelas", "banco", "argolas", "elastico", "peso"],
};

/**
 * Respostas gravadas quando a pergunta era o lugar. Cada lugar vira o que ele
 * implicava naquela época — "academia" incluía peso, como dizia o pedido pra IA.
 */
export type LegacyEquipment = "chao" | "casa_barra" | "praca" | "academia";

export const LEGACY_GEAR: Record<LegacyEquipment, GearItem[]> = {
  chao: ["parede"],
  casa_barra: ["parede", "barra"],
  praca: ["parede", "barra", "paralelas", "banco"],
  academia: ["parede", "barra", "paralelas", "banco", "peso"],
};

/** Lista válida a partir do que estiver gravado (lista nova ou lugar antigo). */
export function normalizeEquipment(raw: unknown): Equipment {
  if (typeof raw === "string") return LEGACY_GEAR[raw as LegacyEquipment] ?? ["parede"];
  if (Array.isArray(raw)) return GEAR_ITEMS.filter((g) => raw.includes(g));
  return ["parede"];
}

/**
 * O que a pessoa quer, em uma palavra. Geral de propósito: o app tem 17 skills e
 * uma lista de objetivos por skill nunca cobriria todas (quem quer planche não
 * acharia a opção). A skill específica fica em Ajustes → "Meus objetivos", que já
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

export function hasBar(e: Equipment): boolean {
  return e.includes("barra");
}

export function hasParallels(e: Equipment): boolean {
  return e.includes("paralelas");
}

/** Item da lista → tags de equipamento do catálogo de exercícios. */
const CATALOG_TAGS: Record<GearItem, string[]> = {
  parede: ["parede"],
  barra: ["barra"],
  paralelas: ["paralelas"],
  banco: ["banco"],
  argolas: ["argolas"],
  paralettes: ["paralettes"],
  elastico: ["banda elástica"],
  peso: ["lastro", "halter"],
};

/**
 * Item da lista → chaves de equipamento das escadas (progressions.json). Poste
 * ninguém declara, então degrau que pede só isso fica fora pra todo mundo:
 * melhor a IA saber que o degrau não cabe do que mandar subir pra ele.
 */
const LADDER_KEYS: Partial<Record<GearItem, string>> = {
  barra: "pull_up_bar",
  paralelas: "parallel_bars",
  banco: "bench",
  argolas: "rings",
  paralettes: "parallettes",
};

/** Degrau cabe no setup: não pede nada, ou pede algo (qualquer um da lista) que o setup tem. */
export function stepFitsEquipment(stepEquipment: readonly string[], e: Equipment): boolean {
  if (stepEquipment.length === 0) return true;
  const have = e.flatMap((g) => LADDER_KEYS[g] ?? []);
  return stepEquipment.some((x) => have.includes(x));
}

/**
 * O que o setup oferece em tags do catálogo. Chão e porta todo mundo tem: a
 * porta é o que a remada com toalha usa no lugar da barra.
 */
export function availableTags(e: Equipment): string[] {
  return ["chão", "porta", ...e.flatMap((g) => CATALOG_TAGS[g])];
}

/**
 * Uma semente serve se tudo que ela pede está no setup. Quem tem barra também
 * consegue a semente que só usa o chão: ela pede MENOS, não outra coisa.
 */
export function seedFits(seedTags: readonly string[], e: Equipment): boolean {
  const have = new Set(availableTags(e));
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
 * Semente sugerida (o usuário pode trocar). As de corpo inteiro vêm primeiro: com
 * empurrar, puxar (quando há barra), pernas e core em todo treino, cada grupo é
 * treinado 2+ vezes por semana a partir de 2 treinos semanais — o mínimo do
 * position stand do ACSM de 2026. As divididas antigas (um padrão por treino)
 * só passam disso com 6 treinos por semana, por isso saíram da sugestão.
 *
 * `intermediario` (dividido) continua sendo a sugestão de quem tem paralelas: é
 * a única semente com dips. Avançado cai na semente do topo do seu equipamento.
 */
export function suggestSeed(a: Pick<OnboardingAnswers, "equipment" | "level">): SeedId {
  const bar = hasBar(a.equipment);
  if (a.level === "iniciante") {
    return bar ? "iniciante-corpo-inteiro-com-barra" : "iniciante-corpo-inteiro-sem-barra";
  }
  if (!bar) return "intermediario-sem-barra";
  return hasParallels(a.equipment) ? "intermediario" : "intermediario-com-barra";
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
 * Respostas gravadas antes da pergunta de nível tinham 4 perguntas de capacidade.
 * Convertidas aqui pra quem as fez não perder o que respondeu: o nível é o MAIOR
 * cuja faixa de posições a pessoa alcança em TODA skill perguntada. Exigir todas
 * erra pra baixo, que é o lado barato de errar.
 */
export interface LegacyAnswers {
  equipment: LegacyEquipment | Equipment;
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
  const equipment = normalizeEquipment(a.equipment);
  const had: Partial<Record<LevelSkill, number>> = {
    push_up: LEGACY_INDEX.push_up[a.push_up],
    handstand_hold: LEGACY_INDEX.handstand_hold[a.handstand_hold],
  };
  if (hasBar(equipment) && a.pull_up) had.pull_up = LEGACY_INDEX.pull_up[a.pull_up];
  if (hasParallels(equipment) && a.dips) had.dips = LEGACY_INDEX.dips[a.dips];
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
