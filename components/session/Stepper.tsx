"use client";

import { useEffect, useRef } from "react";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";

export function Stepper({
  index,
  value,
  unit,
  onChange,
}: {
  index: number;
  value: number;
  unit: string;
  onChange: (next: number) => void;
}) {
  // press-and-hold: repete enquanto segura, acelerando levemente
  const valueRef = useRef(value);
  valueRef.current = value;
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  // evita incremento duplo: pointerdown já aplicou → click subsequente ignora.
  // click "puro" (teclado Enter/Espaço) não é precedido de pointer → aplica.
  const handledByPointer = useRef(false);

  const clearHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  };
  useEffect(() => clearHold, []);

  const apply = (dir: 1 | -1) =>
    onChange(Math.max(0, valueRef.current + dir));

  const startHold = (dir: 1 | -1) => {
    handledByPointer.current = true;
    apply(dir);
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => apply(dir), 110);
    }, 400);
  };

  const onClick = (dir: 1 | -1) => {
    if (handledByPointer.current) {
      handledByPointer.current = false;
      return;
    }
    apply(dir);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 font-mono text-xs text-muted">{index + 1}</span>
      <button
        type="button"
        aria-label={`Diminuir série ${index + 1}`}
        onClick={() => onClick(-1)}
        onPointerDown={() => startHold(-1)}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        className="tap flex items-center justify-center rounded-lg border border-border bg-surface2 text-text active:scale-95"
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <span className="tnum w-14 text-center text-lg tabular-nums">
        {value}
        {unit === "s" ? "s" : ""}
      </span>
      <button
        type="button"
        aria-label={`Aumentar série ${index + 1}`}
        onClick={() => onClick(1)}
        onPointerDown={() => startHold(1)}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onContextMenu={(e) => e.preventDefault()}
        className="tap flex items-center justify-center rounded-lg border border-border bg-surface2 text-text active:scale-95"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
