import type { Progression } from "@/lib/plan/schema";

export type StepStatus = "done" | "focus" | "locked";

/**
 * Índice do passo "em foco" na cadeia = primeiro passo ainda não conquistado.
 * Um passo com `exercise_id` conta como conquistado quando está em `achieved`
 * (teve sucesso limpo). O goal (`exercise_id: null`) nunca é auto-conquistado.
 */
export function chainPosition(steps: Progression[], achieved: Set<string>): number {
  let i = 0;
  while (i < steps.length) {
    const id = steps[i].exercise_id;
    if (id === null || !achieved.has(id)) break;
    i++;
  }
  return i;
}

export function stepStatus(index: number, position: number): StepStatus {
  if (index < position) return "done";
  if (index === position) return "focus";
  return "locked";
}
