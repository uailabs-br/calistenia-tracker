"use client";

import { plan } from "@/lib/plan/loader";

/**
 * Seletor de template de treino. Cada "dia" é um template; o weekday é só a
 * sugestão. Permite fazer, p.ex., o treino de terça numa segunda.
 */
export function DayPills({
  selected,
  today,
  onSelect,
}: {
  selected: number;
  today: number;
  onSelect: (weekday: number) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2 pb-1">
        {plan.days.map((d) => {
          const active = d.weekday === selected;
          const isToday = d.weekday === today;
          return (
            <button
              key={d.weekday}
              type="button"
              onClick={() => onSelect(d.weekday)}
              aria-pressed={active}
              className="tap flex shrink-0 flex-col items-start rounded-xl border px-3 py-2 transition-colors duration-200"
              style={
                active
                  ? { borderColor: d.accent, background: d.accent_bg }
                  : { borderColor: "var(--color-border)", background: "var(--color-surface)" }
              }
            >
              <span
                className="font-mono text-xs"
                style={{ color: active ? d.accent : "var(--color-muted)" }}
              >
                {d.label}
                {isToday && " · hoje"}
              </span>
              <span
                className="mt-0.5 max-w-[7rem] truncate text-sm font-medium"
                style={{ color: active ? "var(--color-text)" : "var(--color-muted)" }}
              >
                {d.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
