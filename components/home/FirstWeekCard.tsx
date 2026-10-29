"use client";

import type { FirstWeek } from "@/lib/domain/firstWeek";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Na primeira semana, no lugar da constância: o anel de 0/3 e os dias vazios não
 * dizem nada pra quem está começando, e a lista já começa com um passo feito.
 */
export function FirstWeekCard({ week }: { week: FirstWeek }) {
  const total = week.items.length;
  return (
    <section aria-label="Sua primeira semana" className="card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Sua primeira semana</p>
        <p className="tnum font-mono text-xs text-muted">
          {week.done} de {total}
        </p>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-ac transition-all duration-500"
          style={{ width: `${(week.done / total) * 100}%` }}
        />
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {week.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5 text-sm">
            <span
              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
                item.done ? "bg-ac text-on-accent" : "border border-border"
              }`}
              aria-hidden="true"
            >
              {item.done && <CheckIcon className="h-3 w-3" />}
            </span>
            <span className={item.done ? "text-muted" : undefined}>
              {item.label}
              <span className="sr-only">{item.done ? " (feito)" : " (falta)"}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
