/**
 * Intensidade de uma célula do calendário de constância. Binário por decisão do
 * produto (treinou / não treinou), com um segundo degrau só pra dias de mais de
 * um treino, que antes eram indistinguíveis.
 */
export type HeatLevel = "future" | "empty" | "one" | "many";

export function heatLevel(d: { count: number; future: boolean }): HeatLevel {
  if (d.future) return "future";
  if (d.count <= 0) return "empty";
  return d.count === 1 ? "one" : "many";
}
