"use client";

/** RIR percebido (reps na reserva) — granularidade de sessão, não por série. */
const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

export function RirSelector({
  value,
  accent,
  onChange,
}: {
  value: number;
  accent: string;
  onChange: (rir: number) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] text-muted">RIR (reps na reserva)</p>
      <div className="flex flex-wrap gap-2">
        {RIR_OPTIONS.map((rir) => {
          const on = rir === value;
          return (
            <button
              key={rir}
              type="button"
              onClick={() => onChange(rir)}
              aria-pressed={on}
              className="tap rounded-full border px-3 text-sm transition-colors duration-200"
              style={
                on
                  ? { background: accent, borderColor: accent, color: "var(--color-on-accent)" }
                  : { borderColor: "var(--color-border)", color: "var(--color-muted)" }
              }
            >
              {rir}
            </button>
          );
        })}
      </div>
    </div>
  );
}
