import type { Parsed } from "@/lib/plan/schema";

/**
 * Reconstitui os valores-alvo por série a partir de `parsed`.
 * Ex: { sets: 4, target: 4 } → [4, 4, 4, 4]
 * Retorna [] quando parsed é null (exercício sem stepper).
 */
export function targetSets(parsed: Parsed | null): number[] {
  if (!parsed) return [];
  return Array.from({ length: parsed.sets }, () => parsed.target);
}

/** Rótulo curto de unidade para exibição junto ao stepper. */
export function unitLabel(parsed: Parsed | null): string {
  if (!parsed) return "";
  switch (parsed.unit) {
    case "reps":
      return "reps";
    case "seconds":
      return "s";
    case "attempts":
      return "tent.";
  }
}

/** Formata um valor de série com a unidade (ex: "20s", "8"). */
export function formatValue(value: number, parsed: Parsed | null): string {
  if (!parsed) return String(value);
  return parsed.unit === "seconds" ? `${value}s` : String(value);
}
