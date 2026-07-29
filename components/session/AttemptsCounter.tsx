"use client";

import { MinusIcon, PlusIcon } from "@/components/ui/icons";

function CounterRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Diminuir ${label}`}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="tap flex items-center justify-center rounded-lg border border-border bg-surface2 text-text active:scale-95"
        >
          <MinusIcon className="h-5 w-5" />
        </button>
        <span className="tnum w-8 text-center text-lg tabular-nums">{value}</span>
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(value + 1)}
          className="tap flex items-center justify-center rounded-lg border border-border bg-surface2 text-text active:scale-95"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Registro por tentativas (skill_consistency) — substitui o Stepper de
 * séries pros exercícios cujo alvo é consistência, não reps/segundos
 * (ex.: kick-up de handstand). `attempts_good` nunca passa de `attempts_total`.
 */
export function AttemptsCounter({
  total,
  good,
  onChange,
}: {
  total: number;
  good: number;
  onChange: (next: { total: number; good: number }) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <CounterRow
        label="tentativas totais"
        value={total}
        onChange={(next) => onChange({ total: next, good: Math.min(good, next) })}
      />
      <CounterRow
        label="tentativas boas"
        value={good}
        onChange={(next) => onChange({ total, good: Math.min(next, total) })}
      />
    </div>
  );
}
