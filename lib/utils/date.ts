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

/** Desloca uma dateKey em `days` dias (negativo volta no tempo). */
export function shiftDays(dateKey: string, days: number): string {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDateKey(d);
}

/** Segunda-feira (dateKey) da semana de uma dateKey. */
export function weekStartKey(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  const dow = d.getDay(); // 0 dom .. 6 sáb
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return localDateKey(d);
}

/** Duração legível a partir de dois timestamps (ms). Ex: "32 min", "1h05". */
export function formatDuration(startMs: number, endMs: number): string | null {
  const ms = endMs - startMs;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Data por extenso a partir de uma dateKey. Ex: "14 de julho de 2026". */
export function longDate(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
