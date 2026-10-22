/**
 * "Hora de trocar de treino" não existe nos dados; existe "vários degraus prontos
 * ao mesmo tempo", que é a mesma coisa em linguagem de motor. Pura: quem chama
 * traz os números.
 */

/** Degraus de skill prontos que justificam o aviso (ou metade deles, o que for menor). */
export const SWAP_MIN_READY = 2;

export interface SwapInput {
  /** ids dos exercícios de skill hoje "prontos pra subir" */
  readyIds: string[];
  /** quantos exercícios do plano são degrau de alguma skill */
  skillCount: number;
  /** sessões do plano concluídas desde a última troca de plano */
  sessionsSinceSwap: number;
  /** nº de treinos do plano (um ciclo completo) */
  cycleLength: number;
  /** ids que estavam prontos quando a pessoa dispensou o aviso */
  acked: string[];
}

export interface SwapSignal {
  show: boolean;
  readyIds: string[];
}

/**
 * Avisa quando há degraus prontos suficientes E já rodou um ciclo inteiro desde a
 * última troca (dois degraus fáceis prontos na primeira semana não significam
 * plano vencido).
 *
 * A dispensa guarda QUAIS ids estavam prontos: o aviso volta só se aparecer um id
 * novo. Se o conjunto encolhe, não volta — a pessoa já disse que viu.
 */
export function swapSignal(input: SwapInput): SwapSignal {
  const { readyIds, skillCount, sessionsSinceSwap, cycleLength, acked } = input;
  const threshold = Math.max(1, Math.min(SWAP_MIN_READY, Math.ceil(skillCount / 2)));
  const enough = skillCount > 0 && readyIds.length >= threshold;
  const cycled = sessionsSinceSwap >= Math.max(1, cycleLength);
  const seen = new Set(acked);
  const fresh = readyIds.some((id) => !seen.has(id));
  return { show: enough && cycled && fresh, readyIds };
}
