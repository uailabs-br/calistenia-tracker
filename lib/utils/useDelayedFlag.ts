"use client";

import { useEffect, useState } from "react";

/**
 * `true` só depois que `on` passou `ms` seguidos ligado. É o que decide se o
 * carregamento aparece: o banco é local e quase sempre responde antes disso, e
 * um skeleton que pisca 50ms parece mais lento do que tela nenhuma.
 */
export function useDelayedFlag(on: boolean, ms = 200): boolean {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!on) {
      setLate(false);
      return;
    }
    const t = window.setTimeout(() => setLate(true), ms);
    return () => window.clearTimeout(t);
  }, [on, ms]);
  return on && late;
}
