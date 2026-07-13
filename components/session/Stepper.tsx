"use client";

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
  return (
    <div className="flex items-center gap-3">
      <span className="w-6 font-mono text-xs text-muted">{index + 1}</span>
      <button
        type="button"
        aria-label={`Diminuir série ${index + 1}`}
        onClick={() => onChange(Math.max(0, value - 1))}
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
        onClick={() => onChange(value + 1)}
        className="tap flex items-center justify-center rounded-lg border border-border bg-surface2 text-text active:scale-95"
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
