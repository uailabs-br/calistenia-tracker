/**
 * Conversão do formato antigo (agenda semanal: `days[].weekday`) para o novo
 * (`workouts[]` em sequência, cada um com `id`). Usada em três lugares, sempre
 * pela mesma regra: o plano importado no localStorage, o JSON colado na
 * importação e a migração do histórico (Dexie v5).
 *
 * Regra: ordena os treinos pelo weekday e atribui A, B, C… nessa ordem. O mapa
 * não é fixo porque cada aparelho pode ter importado um plano diferente.
 */

/** Forma antiga de um treino. Só existe aqui, pra converter. */
interface LegacyDay {
  weekday: number;
  label: string;
  [key: string]: unknown;
}

interface LegacyPlan {
  days: LegacyDay[];
  [key: string]: unknown;
}

/** Letra de um índice, estilo planilha: 0→A … 25→Z, 26→AA … */
export function workoutIdFor(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

export function isLegacyPlan(raw: unknown): raw is LegacyPlan {
  return (
    typeof raw === "object" &&
    raw !== null &&
    Array.isArray((raw as { days?: unknown }).days) &&
    !("workouts" in raw)
  );
}

/** Dias na ordem de treino: por weekday; empate mantém a ordem do arquivo. */
function inSequence(days: LegacyDay[]): LegacyDay[] {
  return days
    .map((day, i) => ({ day, i }))
    .sort((a, b) => a.day.weekday - b.day.weekday || a.i - b.i)
    .map((x) => x.day);
}

/** Converte um plano antigo. Devolve o objeto no formato novo (ainda não validado). */
export function convertLegacyPlan(raw: LegacyPlan): Record<string, unknown> {
  const { days, ...rest } = raw;
  const workouts = inSequence(days).map((day, i) => {
    const { weekday: _weekday, ...workout } = day;
    const id = workoutIdFor(i);
    return { ...workout, id, label: id };
  });
  return { ...rest, workouts };
}

/** weekday → id, do jeito que `convertLegacyPlan` atribui. */
export function legacyWeekdayMap(days: LegacyDay[]): Map<number, string> {
  const map = new Map<number, string>();
  inSequence(days).forEach((day, i) => {
    if (!map.has(day.weekday)) map.set(day.weekday, workoutIdFor(i));
  });
  return map;
}

/**
 * Plano padrão antigo (Seg–Sex), fixo: o plano bundlado já foi convertido, então
 * não dá pra derivar o mapa dele. Só serve pra migrar histórico feito com o padrão.
 */
const BUNDLED_LEGACY_WEEKDAY_MAP = new Map<number, string>([
  [1, "A"],
  [2, "B"],
  [3, "C"],
  [4, "D"],
  [5, "E"],
]);

/**
 * Mapa weekday → id a partir do que está no localStorage (`raw`). Sem override
 * (ou override ilegível), vale o padrão bundlado.
 */
export function legacyWeekdayMapFromStorage(raw: string | null): Map<number, string> {
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isLegacyPlan(parsed)) return legacyWeekdayMap(parsed.days);
    } catch {
      /* override corrompido → padrão */
    }
  }
  return BUNDLED_LEGACY_WEEKDAY_MAP;
}
