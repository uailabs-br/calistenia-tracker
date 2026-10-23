import type { Parsed } from "@/lib/plan/schema";
import type { SetValue } from "@/lib/db/schema";
import { targetSets } from "./parseTarget";

/**
 * Registro série a série → o mesmo log que o fluxo de exercício inteiro gravaria.
 *
 * Todas as séries planejadas exatamente no alvo viram `as_target`: é assim que o
 * resto do app lê "como previsto" (exportação pra IA, última performance). Com
 * intervalo ("3 × 6-8") o alvo do log é o PISO, então 8/8/8 não é "como previsto":
 * grava as séries reais, senão o volume leria 6/6/6.
 */
export function recordFromSets(
  values: number[],
  parsed: Parsed | null,
  target: string
): { as_target: boolean; sets: SetValue[] | null } {
  const planned = targetSets(parsed, target);
  const asTarget =
    planned.length > 0 &&
    values.length === planned.length &&
    values.every((v, i) => v === planned[i]);
  if (asTarget) return { as_target: true, sets: null };
  return { as_target: false, sets: values.map((value, index) => ({ index, value })) };
}
