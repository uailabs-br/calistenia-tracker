/**
 * Vibração curta de confirmação (PWA no Android; iOS não expõe a API e vira no-op).
 * Respeita "reduzir movimento": quem pediu menos estímulo não leva vibração extra.
 */
export function haptic(ms = 10): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  navigator.vibrate(ms);
}
