import type { CSSProperties } from "react";

const LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

/**
 * Seg→Dom da semana revisada: dia treinado aceso com a letra do treino ("+" é
 * avulso). Com `animateFrom`, os dias treinados acendem um a um a partir desse
 * instante (ms).
 */
export function WeekDays({
  days,
  size = "lg",
  animateFrom,
}: {
  days: (string | null)[];
  size?: "sm" | "lg";
  animateFrom?: number;
}) {
  let lit = 0;
  return (
    <div className="grid grid-cols-7 gap-1.5" aria-hidden="true">
      {days.map((label, i) => {
        const delay = animateFrom !== undefined && label ? animateFrom + lit++ * 140 : null;
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`flex aspect-square w-full items-center justify-center border font-mono font-medium ${
                size === "lg" ? "max-w-10 rounded-lg text-sm" : "max-w-7 rounded-md text-2xs"
              } ${label ? "border-ac bg-ac text-on-accent" : "border-border text-muted"} ${
                delay !== null ? "anim-lit" : ""
              }`}
              style={delay !== null ? ({ "--d": `${delay}ms` } as CSSProperties) : undefined}
            >
              {label}
            </span>
            <span className="font-mono text-3xs text-muted">{LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
