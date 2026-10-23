"use client";

import { useEffect, useRef } from "react";
import { haptic } from "@/lib/utils/haptics";

/**
 * Botões de − / + com press-and-hold: o toque aplica um passo, segurar repete
 * (depois de 400ms, a cada 110ms). Devolve os handlers pra espalhar no botão.
 */
export function useHoldRepeat(step: (dir: 1 | -1) => void) {
  // a repetição chama sempre o passo do render mais recente (valor atual)
  const stepRef = useRef(step);
  stepRef.current = step;
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  // evita incremento duplo: pointerdown já aplicou → click subsequente ignora.
  // click "puro" (teclado Enter/Espaço) não é precedido de pointer → aplica.
  const handledByPointer = useRef(false);

  const clear = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  };
  useEffect(() => clear, []);

  const start = (dir: 1 | -1) => {
    handledByPointer.current = true;
    // só no toque inicial: vibrar a cada repetição do segurar vira zumbido
    haptic(6);
    stepRef.current(dir);
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => stepRef.current(dir), 110);
    }, 400);
  };

  return (dir: 1 | -1) => ({
    onClick: () => {
      if (handledByPointer.current) {
        handledByPointer.current = false;
        return;
      }
      stepRef.current(dir);
    },
    onPointerDown: () => start(dir),
    onPointerUp: clear,
    onPointerLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
}
