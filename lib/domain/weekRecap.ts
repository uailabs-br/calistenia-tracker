/**
 * Textos da tela "Semana passada" (resumo da semana na home). Puro: recebe o
 * resumo já calculado (lib/db/queries/weekReview.ts) e devolve o que a tela
 * escreve. Sem frase motivacional, como no fim do treino: o número já diz.
 */

import type { WeekReview } from "@/lib/db/queries/weekReview";
import { remainingSessions, shortSkillName, type CampaignItem } from "./campaign";

const month = (dateKey: string, style: "long" | "short") =>
  new Date(`${dateKey}T12:00:00`)
    .toLocaleDateString("pt-BR", { month: style })
    .replace(".", "");
const day = (dateKey: string) => Number(dateKey.slice(8, 10));

/** "Segunda 19 a domingo 25 de outubro" (ou com os dois meses, se a semana virar o mês). */
export function weekRangeLong(start: string, end: string): string {
  const m1 = month(start, "long");
  const m2 = month(end, "long");
  return m1 === m2
    ? `Segunda ${day(start)} a domingo ${day(end)} de ${m2}`
    : `Segunda ${day(start)} de ${m1} a domingo ${day(end)} de ${m2}`;
}

/** "19 a 25 out" (ou "29 set a 5 out"). */
export function weekRangeShort(start: string, end: string): string {
  const m1 = month(start, "short");
  const m2 = month(end, "short");
  return m1 === m2 ? `${day(start)} a ${day(end)} ${m2}` : `${day(start)} ${m1} a ${day(end)} ${m2}`;
}

export interface Highlight {
  kind: "level" | "record" | "lag";
  text: string;
}

const unitSuffix = (unit: "reps" | "seconds") => (unit === "seconds" ? "s" : " reps");

/**
 * No máximo três destaques, na ordem em que importam: nível concluído, recordes
 * (juntos numa linha) e o que ficou pra trás. É o limite que faz a tela caber
 * sem rolar.
 */
export function weekHighlights(r: WeekReview, max = 3): Highlight[] {
  const out: Highlight[] = r.levelsClosed.map((l) => ({
    kind: "level",
    text: `${shortSkillName(l.skillName)} · nível ${l.level} concluído`,
  }));

  if (r.records.length > 0) {
    const list = r.records.map((x) => `${x.name} ${x.value}${unitSuffix(x.unit)}`).join(", ");
    out.push({
      kind: "record",
      text: r.records.length === 1 ? `Recorde: ${list}` : `${r.records.length} recordes: ${list}`,
    });
  }

  const missing = r.goal - r.sessionsDone;
  if (missing > 0) {
    out.push({
      kind: "lag",
      text:
        missing === 1
          ? "1 treino da meta não saiu."
          : `${missing} treinos da meta não saíram.`,
    });
  }
  for (const s of [...r.skipped].sort((a, b) => b.count - a.count)) {
    out.push({
      kind: "lag",
      text: `${s.name} ficou de fora ${s.count} ${s.count === 1 ? "vez" : "vezes"}.`,
    });
  }
  return out.slice(0, max);
}

/** O objetivo em jogo no próximo treino, em uma linha. */
export function nextStakeLine(item: CampaignItem): string {
  const name = shortSkillName(item.skillName);
  const left = remainingSessions(item);
  if (left === 0) return `${name}: nível ${item.level} batido, falta ajustar o plano.`;
  if (left === 1) return `${name} pode fechar o nível ${item.level} nesse treino.`;
  return `${name} · nível ${item.level}, ${item.streak} de ${item.required} sessões.`;
}
