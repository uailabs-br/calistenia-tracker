"use client";

import { plan } from "@/lib/plan/loader";
import { themedAccent, themedAccentBg } from "@/components/ui/accent";

/**
 * Seletor de treino. Cada treino é um template: o "próximo" da sequência é só
 * a sugestão, e dá pra fazer qualquer um (ex: o C antes do B).
 */
export function WorkoutPills({
  selectedId,
  nextId,
  onSelect,
}: {
  selectedId: string;
  nextId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <div className="flex gap-2 pb-1">
        {plan.workouts.map((w) => {
          const active = w.id === selectedId;
          const isNext = w.id === nextId;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w.id)}
              aria-pressed={active}
              className="tap flex shrink-0 flex-col items-start justify-center rounded-xl border px-3.5 py-3 transition-colors duration-200 active:scale-[0.97]"
              style={
                active
                  ? { borderColor: themedAccent(w.accent), background: themedAccentBg(w.accent_bg) }
                  : { borderColor: "var(--color-border)", background: "var(--color-surface)" }
              }
            >
              <span
                className="font-mono text-xs"
                style={{ color: active ? themedAccent(w.accent) : "var(--color-muted)" }}
              >
                {w.label}
                {isNext && " · próximo"}
              </span>
              <span
                className={`mt-0.5 max-w-[7rem] truncate text-sm font-medium ${active ? "text-text" : "text-muted"}`}
              >
                {w.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
