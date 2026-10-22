import type { Parsed } from "@/lib/plan/schema";

/**
 * Extrai { sets, low, high } direto do texto livre `target`. Serve de fallback
 * quando `parsed` é null (alvo é um intervalo, ex: "6-8", que a IA não
 * consegue reduzir a um número único) e também como fonte de verdade pro
 * valor baixo do alvo — mesmo quando `parsed` existe, `parsed.target` pode
 * ter capturado o teto do intervalo em vez do piso.
 * Ex: "3 × 6-8/lado" → { sets: 3, low: 6, high: 8 } · "4 rep" → { sets: 1, low: 4, high: 4 }
 * Retorna null quando não há nenhum número reconhecível no texto.
 */
function parseTargetText(
  target: string
): { sets: number; low: number; high: number } | null {
  const range = String.raw`(\d+)(?:\s*[-–]\s*(\d+))?`;
  const withSets = target.match(new RegExp(String.raw`^\s*(\d+)\s*[×xX]\s*` + range));
  if (withSets) {
    const low = Number(withSets[2]);
    return { sets: Number(withSets[1]), low, high: Math.max(low, Number(withSets[3] ?? low)) };
  }
  const single = target.match(new RegExp(range));
  if (single) {
    const low = Number(single[1]);
    return { sets: 1, low, high: Math.max(low, Number(single[2] ?? low)) };
  }
  return null;
}

/**
 * Número que a progressão compara com as séries feitas. `parsed` manda quando
 * existe; sem ele (todo alvo com intervalo, pelo contrato do prompt) cai no piso
 * do texto. Antes devolvia null e nenhum registro ajustado contava como "bateu o
 * alvo" — só o "fiz como previsto" —, o que esconderia o sinal de progressão de
 * quem ajusta as reps.
 */
export function targetValue(parsed: Parsed | null, target = ""): number | null {
  return parsed?.target ?? parseTargetText(target)?.low ?? null;
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
 * Valores iniciais dos steppers ao ajustar. Abre no TETO do intervalo ("3 × 6-8"
 * → 8): quem ajusta quase sempre fez o topo da faixa e só tira reps se ficou
 * aquém. `targetSets` segue no piso de propósito — é o que reconstitui "fiz como
 * previsto" na leitura do passado, e mexer nele reescreveria volume e recorde.
 * Sempre devolve ao menos uma série, mesmo sem número reconhecível, para que
 * qualquer exercício possa ter as reps realizadas ajustadas.
 */
export function adjustSets(parsed: Parsed | null, target = ""): number[] {
  const spec = parseTargetText(target);
  const sets = spec?.sets ?? parsed?.sets;
  const high = spec?.high ?? parsed?.target;
  if (!sets || high === undefined) return [1];
  return Array.from({ length: sets }, () => high);
}

export type TargetUnit = "reps" | "seconds" | "attempts";

/**
 * Unidade do alvo. `parsed` é null em todo alvo com intervalo ("3 × 8-10"), que é
 * o formato que a IA é obrigada a usar — então o texto é o fallback, não a exceção.
 * Sem `parsed` e sem número no texto, devolve null (não dá pra saber).
 */
export function unitOf(parsed: Parsed | null, target = ""): TargetUnit | null {
  if (parsed) return parsed.unit;
  if (/tentativa/i.test(target)) return "attempts";
  if (!/\d/.test(target)) return null;
  if (/\d\s*(s|seg\w*)\b/i.test(target)) return "seconds";
  return "reps";
}

/** Alvo por lado? `parsed` manda; sem ele, lê "/lado" do texto. */
export function perSideOf(parsed: Parsed | null, target = ""): boolean {
  if (parsed) return parsed.per_side;
  return /\/\s*lado/i.test(target);
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

/** " + extra 6/5" a partir das séries extras (vazio sem extras). */
export function formatExtras(extra: number[], parsed: Parsed | null): string {
  if (extra.length === 0) return "";
  return ` + extra ${extra.map((v) => formatValue(v, parsed)).join("/")}`;
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
