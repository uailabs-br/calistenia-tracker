/** Data local em ISO curto YYYY-MM-DD (sem fuso, para agrupar por dia). */
export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** DD/MM a partir de uma dateKey ou timestamp. */
export function shortDate(input: string | number): string {
  const d = typeof input === "number" ? new Date(input) : new Date(input + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${m}`;
}

/** Dia da semana 0-6 (0 = domingo), local. */
export function weekdayOf(d: Date = new Date()): number {
  return d.getDay();
}

/** Diferença em dias entre duas dateKeys (b - a). */
export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86_400_000);
}
