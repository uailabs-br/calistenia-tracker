"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { useHoldRepeat } from "@/lib/utils/useHoldRepeat";

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
  const hold = useHoldRepeat((dir) => onChange(Math.max(0, value + dir)));

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 font-mono text-xs text-muted">{index + 1}</span>
      <button
        type="button"
        aria-label={`Diminuir série ${index + 1}`}
        {...hold(-1)}
        className="btn-key tap flex items-center justify-center rounded-lg text-text"
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <span className="tnum w-14 overflow-hidden text-center text-lg tabular-nums">
        <RollingNumber value={value} suffix={unit === "s" ? "s" : ""} />
      </span>
      <button
        type="button"
        aria-label={`Aumentar série ${index + 1}`}
        {...hold(1)}
        className="btn-key tap flex items-center justify-center rounded-lg text-text"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
