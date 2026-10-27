import type { SkillCategory } from "@/lib/plan/skills";

/** Um exercício do treino: a categoria dele (null = desconhecida) e quantas séries tem. */
export interface FocusEntry {
  category: SkillCategory | null;
  sets: number;
}

/**
 * Foco do treino (tela de carregamento): as categorias com pelo menos `minShare`
 * das séries, da maior pra menor. Conta por série, não por exercício: um
 * "4 × 4" pesa mais que um "1 × 8". Exercício sem categoria fica fora da conta;
 * se menos da metade das séries tiver categoria, devolve null. Melhor sumir do
 * que mostrar um foco errado.
 */
export function workoutFocus(entries: FocusEntry[], minShare = 0.25): SkillCategory[] | null {
  const total = entries.reduce((n, e) => n + e.sets, 0);
  const byCat = new Map<SkillCategory, number>();
  for (const e of entries) {
    if (e.category) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.sets);
  }
  const known = [...byCat.values()].reduce((n, v) => n + v, 0);
  if (total === 0 || known * 2 < total) return null;
  // sort é estável: empate fica na ordem em que a categoria aparece no treino
  return [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, sets]) => sets / known >= minShare)
    .map(([cat]) => cat);
}

/** "Puxar", "Puxar e empurrar", "Core, empurrar e puxar". */
export function focusLabel(cats: SkillCategory[]): string {
  const words = cats.map((c, i) => (i === 0 ? c : c.toLowerCase()));
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} e ${words.at(-1)}`;
}
