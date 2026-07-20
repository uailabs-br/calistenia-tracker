export type StepStatus = "done" | "focus" | "locked";

/**
 * Posição do usuário numa escada de skill = índice da etapa em foco = logo após
 * a etapa mapeada mais avançada que já foi conquistada (sucesso limpo nos logs).
 * Etapas anteriores a essa contam como concluídas mesmo sem exercício mapeado.
 * Nada conquistado → foco na 1ª etapa (índice 0).
 */
export function skillPosition(
  steps: { exercise_id?: string }[],
  achieved: Set<string>
): number {
  let maxAchieved = -1;
  steps.forEach((s, i) => {
    if (s.exercise_id && achieved.has(s.exercise_id)) maxAchieved = i;
  });
  return maxAchieved + 1;
}

export function stepStatus(index: number, position: number): StepStatus {
  if (index < position) return "done";
  if (index === position) return "focus";
  return "locked";
}
