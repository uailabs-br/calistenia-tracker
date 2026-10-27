"use client";

import { useEffect, useState } from "react";

/**
 * Relógio de uma animação em sequência: devolve os ms desde a montagem, parando
 * em `totalMs`. Com "reduzir movimento", ou `animate` falso, já nasce no fim (os
 * números aparecem prontos). Ver lib/domain/timeline.ts pra converter o instante
 * em valores.
 */
export function useTimeline(totalMs: number, animate = true): number {
  const [t, setT] = useState(animate ? 0 : totalMs);
  useEffect(() => {
    if (!animate) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setT(totalMs);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - t0;
      setT(Math.min(elapsed, totalMs));
      if (elapsed < totalMs) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [totalMs, animate]);
  return t;
}
