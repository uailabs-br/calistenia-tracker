import type { Workout } from "@/lib/plan/schema";

/**
 * Sequência de treino, sem dia da semana. O próximo é o seguinte ao último
 * treino concluído do plano, em volta do ciclo (A → B → … → A). Treino avulso
 * não anda a fila: quem chama passa só as sessões do plano.
 *
 * `lastId` null ou fora do plano (o plano mudou) → começa pelo primeiro.
 */
export function nextIndex(lastId: string | null, workouts: Workout[]): number {
  const i = lastId === null ? -1 : workouts.findIndex((w) => w.id === lastId);
  return (i + 1) % workouts.length;
}

/** Fila a partir do próximo, dando a volta no ciclo: [próximo, depois, …]. */
export function queueFrom(lastId: string | null, workouts: Workout[]): Workout[] {
  if (workouts.length === 0) return [];
  const start = nextIndex(lastId, workouts);
  return workouts.map((_, k) => workouts[(start + k) % workouts.length]);
}
