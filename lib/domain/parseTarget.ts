import type { Parsed } from "@/lib/plan/schema";

/**
 * Extrai { sets, low } direto do texto livre `target`. Serve de fallback
 * quando `parsed` é null (alvo é um intervalo, ex: "6-8", que a IA não
 * consegue reduzir a um número único) e também como fonte de verdade pro
 * valor baixo do alvo — mesmo quando `parsed` existe, `parsed.target` pode
 * ter capturado o teto do intervalo em vez do piso.
 * Ex: "3 × 6-8/lado" → { sets: 3, low: 6 } · "4 rep" → { sets: 1, low: 4 }
 * Retorna null quando não há nenhum número reconhecível no texto.
 */
function parseTargetText(target: string): { sets: number; low: number } | null {
  const withSets = target.match(/^\s*(\d+)\s*[×xX]\s*(\d+)/);
  if (withSets) return { sets: Number(withSets[1]), low: Number(withSets[2]) };
  const single = target.match(/(\d+)/);
  if (single) return { sets: 1, low: Number(single[1]) };
  return null;
}

/**
 * Reconstitui os valores-alvo por série. Sempre usa o piso do intervalo
 * (nunca o teto) como valor de cada série — ver `parseTargetText`.
 * `target` é opcional só pra não quebrar chamadas que já sabem que não
 * vão cair no ramo `as_target` (nesse caso o resultado não é usado).
 * Ex: "3 × 6-8/lado" → [6, 6, 6] · "4 × 2" → [2, 2, 2, 2]
 * Retorna [] quando não há sets/low reconhecíveis nem em `target` nem em `parsed`.
 */
export function targetSets(parsed: Parsed | null, target = ""): number[] {
  const spec = parseTargetText(target);
  const sets = spec?.sets ?? parsed?.sets;
  const low = spec?.low ?? parsed?.target;
  if (!sets || low === undefined) return [];
  return Array.from({ length: sets }, () => low);
}

/**
 * Valores iniciais dos steppers ao ajustar. Diferente de `targetSets`,
 * sempre devolve ao menos uma série - mesmo sem número reconhecível - para
 * que qualquer exercício possa ter as reps realizadas ajustadas.
 */
export function adjustSets(parsed: Parsed | null, target = ""): number[] {
  const t = targetSets(parsed, target);
  return t.length > 0 ? t : [1];
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

/**
 * Extrai os segundos de descanso do texto livre do plano.
 * Ex: "descanso 120s" → 120 · "30-45s entre tentativas" → 45 (limite superior).
 * Retorna null quando não há número plausível.
 */
export function parseRestSeconds(rest: string): number | null {
  const nums = (rest.match(/\d+/g) ?? []).map(Number).filter((n) => n > 0 && n <= 600);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

/** mm:ss a partir de segundos. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}
