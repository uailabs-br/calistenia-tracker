import type { Workout, PlanExercise } from "@/lib/plan/schema";
import { parseRestSeconds, perSideOf, targetSets, unitOf, type TargetUnit } from "./parseTarget";

// Trabalho por unidade, em segundos. Constantes grosseiras só para estimar a
// duração — não têm efeito no registro. O que elas erram, a calibração pelo tempo
// real das sessões (`calibrationFactor`) corrige.
const SECONDS_PER_REP = 3;
const SECONDS_PER_ATTEMPT = 10;
/** Montar o próximo exercício: andar até a barra, ajustar a pegada, ler a obs. */
const TRANSITION_SECONDS = 45;
/** Aquecimento escrito sem duração ("Wrist prep · shoulder circles"). */
const DEFAULT_WARMUP_SECONDS = 120;

function workPerUnit(unit: TargetUnit): number {
  switch (unit) {
    case "seconds":
      return 1;
    case "reps":
      return SECONDS_PER_REP;
    case "attempts":
      return SECONDS_PER_ATTEMPT;
  }
}

/** Minutos que o aquecimento declara ("… — 2 min"); sem número, um padrão. */
function warmupSeconds(warmup: string): number {
  if (!warmup.trim()) return 0;
  const m = warmup.match(/(\d+)\s*min/i);
  return m ? Number(m[1]) * 60 : DEFAULT_WARMUP_SECONDS;
}

/**
 * Segundos de um exercício. Lê o TEXTO do alvo, não só `parsed`: pelo contrato
 * da IA, todo alvo com intervalo ("3 × 6-8") vem com `parsed` null, e ignorá-los
 * tirava da conta metade de um plano gerado. Tentativas descansam entre si (é
 * pra isso o "30-45s entre tentativas"), então cada tentativa conta como série.
 */
function exerciseSeconds(ex: PlanExercise): { work: number; rest: number } | null {
  const sets = targetSets(ex.parsed, ex.target);
  const unit = unitOf(ex.parsed, ex.target);
  if (sets.length === 0 || !unit) return null;
  const rest = parseRestSeconds(ex.rest) ?? 0;
  const sides = perSideOf(ex.parsed, ex.target) ? 2 : 1;
  const value = sets[0];
  if (unit === "attempts") {
    const attempts = sets.length * value;
    return { work: attempts * SECONDS_PER_ATTEMPT, rest: Math.max(0, attempts - 1) * rest };
  }
  return {
    work: sets.length * value * workPerUnit(unit) * sides,
    rest: Math.max(0, sets.length - 1) * rest,
  };
}

/**
 * Estima a duração do treino em segundos: aquecimento + por exercício o trabalho
 * das séries (dobrado quando é por lado) e o descanso entre elas + a troca de
 * exercício (descanso do anterior e montagem). Exercício sem número no alvo não
 * entra. 0 = não estimável.
 */
export function estimateDurationSeconds(workout: Workout): number {
  const parts = workout.blocks
    .flatMap((b) => b.exercises)
    .flatMap((ex) => {
      const s = exerciseSeconds(ex);
      return s ? [{ ...s, after: parseRestSeconds(ex.rest) ?? 0 }] : [];
    });
  if (parts.length === 0) return 0;
  let total = warmupSeconds(workout.warmup ?? "");
  parts.forEach((p, i) => {
    total += p.work + p.rest;
    if (i < parts.length - 1) total += p.after + TRANSITION_SECONDS;
  });
  return total;
}

/** Abaixo disso, a mediana é ruído de poucos treinos. */
const MIN_SAMPLES = 3;
/** Treinos recentes que entram na mediana: o ritmo muda com o tempo. */
const MAX_SAMPLES = 10;
/** Sessão fora disso não é um treino medido: esqueceu aberta, ou fechou sem treinar. */
const MIN_REAL_SECONDS = 10 * 60;
const MAX_REAL_SECONDS = 3 * 60 * 60;
/** Limites do fator: um plano muito diferente do anterior não pode virar 3×. */
const MIN_FACTOR = 0.75;
const MAX_FACTOR = 1.75;

/**
 * Quanto o tempo real dos treinos difere da estimativa, como multiplicador.
 * Mediana dos últimos treinos medidos (`samples` do mais antigo pro mais recente),
 * arredondada a 0,05. Sem amostra suficiente, 1.
 */
export function calibrationFactor(samples: { real: number; estimated: number }[]): number {
  const ratios = samples
    .filter((s) => s.estimated > 0 && s.real >= MIN_REAL_SECONDS && s.real <= MAX_REAL_SECONDS)
    .slice(-MAX_SAMPLES)
    .map((s) => s.real / s.estimated)
    .sort((a, b) => a - b);
  if (ratios.length < MIN_SAMPLES) return 1;
  const mid = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
  const clamped = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, median));
  return Math.round(clamped * 20) / 20;
}

/**
 * Duração para exibição: `~Xmin` estimado (já calibrado por `factor`) quando há
 * dados; senão, o texto livre do plano como fallback (ex.: dias de prática).
 */
export function durationLabel(workout: Workout, factor = 1): string {
  const seconds = estimateDurationSeconds(workout);
  if (seconds <= 0) return workout.duration;
  return `~${Math.round((seconds * factor) / 60)}min`;
}
