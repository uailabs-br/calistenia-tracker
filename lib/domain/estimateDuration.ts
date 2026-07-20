import type { PlanDay, Parsed } from "@/lib/plan/schema";
import { parseRestSeconds } from "./parseTarget";

// Trabalho por série, em segundos, por unidade. Constantes grosseiras só para
// estimar a duração — não têm efeito no registro.
const SECONDS_PER_REP = 3;
const SECONDS_PER_ATTEMPT = 20;

function workPerSet(parsed: Parsed): number {
  switch (parsed.unit) {
    case "seconds":
      return parsed.target;
    case "reps":
      return parsed.target * SECONDS_PER_REP;
    case "attempts":
      return SECONDS_PER_ATTEMPT;
  }
}

/**
 * Estima a duração do treino em segundos: por exercício com `parsed`, soma o
 * trabalho das séries + descanso entre séries + um descanso ao trocar de
 * exercício. Exercícios sem `parsed` (sem stepper) não entram. 0 = não estimável.
 */
export function estimateDurationSeconds(day: PlanDay): number {
  const exercises = day.blocks.flatMap((b) => b.exercises);
  let total = 0;
  exercises.forEach((ex, i) => {
    if (!ex.parsed) return;
    const rest = parseRestSeconds(ex.rest) ?? 0;
    const work = ex.parsed.sets * workPerSet(ex.parsed);
    const intraRest = Math.max(0, ex.parsed.sets - 1) * rest;
    const interRest = i < exercises.length - 1 ? rest : 0;
    total += work + intraRest + interRest;
  });
  return total;
}

/**
 * Duração para exibição: `~Xmin` estimado quando há dados; senão, o texto livre
 * do plano como fallback (ex.: dias de prática sem `parsed`).
 */
export function durationLabel(day: PlanDay): string {
  const seconds = estimateDurationSeconds(day);
  if (seconds <= 0) return day.duration;
  return `~${Math.round(seconds / 60)}min`;
}
