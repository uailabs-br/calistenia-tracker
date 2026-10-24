/**
 * Linha do tempo de animações em sequência (tela de fim de treino): cada trecho
 * começa num instante e dura um tempo, medidos em ms desde a abertura. Puro: quem
 * avança o relógio é o hook `useTimeline`.
 */

/** Rápido no começo, devagar no fim: o número "assenta" no valor final. */
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

/** Quanto do trecho [start, start + duration] já passou no instante t, de 0 a 1. */
export function progressAt(t: number, start: number, duration: number): number {
  if (duration <= 0) return t >= start ? 1 : 0;
  return Math.max(0, Math.min(1, (t - start) / duration));
}

/** Valor inteiro de um número que sobe de `from` até `to` dentro do trecho. */
export function countAt(
  t: number,
  to: number,
  start: number,
  duration: number,
  from = 0
): number {
  return Math.round(from + (to - from) * easeOutCubic(progressAt(t, start, duration)));
}
