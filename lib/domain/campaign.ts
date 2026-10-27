/**
 * Campanha: o andamento dos objetivos (as skills de "Meus objetivos") que um
 * treino move. Não inventa número: nível, sequência e sessões exigidas são os do
 * motor de progressão, só postos à vista antes e depois do treino. Puro; quem lê
 * o banco é lib/db/queries/campaign.ts.
 */

import type { Vote } from "./progressionState";

export interface CampaignItem {
  skillId: string;
  skillName: string;
  /** Nível (1-indexed) que o exercício do plano treina. */
  level: number;
  /** Nomes de todos os níveis da escada, em ordem. */
  ladder: string[];
  /** Critério do nível em texto curto (formatCriteria), quando o nível tem. */
  criteria: string | null;
  /** Pontos de forma do nível: viram a dica da tela de carregamento. */
  flags: string[];
  exerciseId: string;
  exerciseName: string;
  target: string;
  /** Sessões seguidas cumprindo o critério, e quantas o nível exige. */
  streak: number;
  required: number;
}

/** Quantas sessões no critério ainda faltam pra fechar o nível. */
export function remainingSessions(item: Pick<CampaignItem, "streak" | "required">): number {
  return Math.max(0, item.required - item.streak);
}

/**
 * Um item por objetivo que o treino move, o mais perto de fechar primeiro (é
 * ele que ganha a escada na tela de carregamento); empate segue a ordem em que
 * a pessoa marcou os objetivos. Objetivo que o treino não toca não aparece.
 */
export function rankCampaign(items: CampaignItem[], goals: string[]): CampaignItem[] {
  const bySkill = new Map<string, CampaignItem>();
  for (const item of items) {
    if (!goals.includes(item.skillId)) continue;
    const current = bySkill.get(item.skillId);
    // Dois exercícios da mesma skill no treino: vale o nível mais alto. O mais
    // baixo é manutenção e não diz onde a pessoa está na escada.
    if (!current || item.level > current.level) bySkill.set(item.skillId, item);
  }
  return [...bySkill.values()].sort(
    (a, b) =>
      remainingSessions(a) - remainingSessions(b) ||
      goals.indexOf(a.skillId) - goals.indexOf(b.skillId)
  );
}

/**
 * O que a sessão de hoje fez com o nível:
 * - `closed`: era a que faltava, o nível fechou;
 * - `advanced`: contou, mas ainda falta sessão;
 * - `reset` / `missed`: não bateu o critério (com ou sem sequência pra perder);
 * - `uncounted`: não votou (exercício sem registro, ou alvo do dia abaixo do critério);
 * - `pending`: o nível já estava batido antes e o plano ainda não subiu.
 *
 * `before` é a sequência sem a sessão de hoje; `today`, o voto dela.
 */
export type SessionOutcome = "closed" | "advanced" | "reset" | "missed" | "uncounted" | "pending";

export function sessionOutcome(
  before: number,
  today: Vote | null,
  required: number
): SessionOutcome {
  if (today && !today.neutral && !today.met) return before > 0 ? "reset" : "missed";
  if (before >= required) return "pending";
  if (!today || today.neutral) return "uncounted";
  return before + 1 >= required ? "closed" : "advanced";
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Nome da skill sem o parêntese do catálogo ("Handstand (Equilíbrio)" →
 * "Handstand"), pras linhas compactas onde ele cortava o andamento.
 */
export function shortSkillName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "") || name;
}

/** Andamento em uma palavra, pra linha da home e da lista "também avança hoje". */
export function statusLabel(item: Pick<CampaignItem, "streak" | "required">): string {
  const left = remainingSessions(item);
  if (left === 0) return "nível batido";
  if (left === 1) return "pode fechar hoje";
  return `${item.streak} de ${item.required}`;
}

/** O que está em jogo hoje, pra tela de carregamento. */
export function stakeLine({ streak, required }: Pick<CampaignItem, "streak" | "required">): string {
  const left = required - streak;
  if (left <= 0) return "Nível já batido. Falta ajustar o plano pro próximo.";
  const start =
    streak > 0
      ? `Você já fez ${streak} de ${required}. `
      : required > 1
        ? `Primeira de ${required} sessões seguidas. `
        : "";
  const after = left - 1;
  const end =
    after === 0
      ? "Batendo hoje, fecha o nível."
      : `Batendo hoje, ${plural(after, "falta uma", `faltam ${after}`)}.`;
  return start + end;
}

/** Como a sessão deixou o nível, pro fim do treino. `neutral` = o voto de hoje foi neutro. */
export function outcomeLine(
  outcome: SessionOutcome,
  after: number,
  required: number,
  neutral = false
): string {
  switch (outcome) {
    case "closed":
      return `${required} de ${required}. Nível concluído.`;
    case "advanced": {
      const left = required - after;
      return `${after} de ${required}. ${plural(left, "Falta uma sessão", `Faltam ${left} sessões`)} no critério pra fechar o nível.`;
    }
    case "reset":
      return `Não bateu o critério hoje. A contagem volta pra 0 de ${required}.`;
    case "missed":
      return `Não bateu o critério hoje. Continua 0 de ${required}.`;
    case "pending":
      return "Nível já batido. Falta ajustar o plano pro próximo.";
    case "uncounted":
      return neutral
        ? "Hoje não contou: o alvo do treino fica abaixo do critério do nível."
        : "Hoje não contou pro nível.";
  }
}

/** Dica de forma da tela de carregamento: os dois primeiros pontos do nível, como frase. */
export function formTip(flags: string[]): string | null {
  const parts = flags
    .slice(0, 2)
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => `${f[0].toUpperCase()}${f.slice(1)}${/[.!?]$/.test(f) ? "" : "."}`);
  return parts.length ? parts.join(" ") : null;
}

/** Sequência depois da sessão, do jeito que a barra mostra (nunca passa do exigido). */
export function streakAfter(before: number, outcome: SessionOutcome, required: number): number {
  if (outcome === "reset" || outcome === "missed") return 0;
  if (outcome === "closed" || outcome === "advanced") return Math.min(required, before + 1);
  return Math.min(required, before);
}

/**
 * Em que votos um nível fechou: o índice (do mais antigo pro mais recente) de
 * cada sessão em que as sessões seguidas no critério chegaram ao exigido. Voto
 * neutro não conta nem quebra, como em `positiveStreak`. É o que o resumo da
 * semana usa pra dizer "nível concluído" sem gravar nada no banco.
 */
export function closingIndexes(votesOldestFirst: Vote[], required: number): number[] {
  const out: number[] = [];
  let run = 0;
  votesOldestFirst.forEach((vote, i) => {
    if (vote.neutral) return;
    if (!vote.met) {
      run = 0;
      return;
    }
    run += 1;
    if (run === required) out.push(i);
  });
  return out;
}
