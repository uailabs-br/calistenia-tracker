/**
 * Estado de uma célula do calendário de constância. Binário por decisão do
 * produto: treinou / não treinou. Dois treinos no mesmo dia não ganham degrau
 * próprio — o calendário mede constância, não volume.
 */
export type HeatLevel = "future" | "empty" | "trained";

export function heatLevel(d: { count: number; future: boolean }): HeatLevel {
  if (d.future) return "future";
  return d.count > 0 ? "trained" : "empty";
}
