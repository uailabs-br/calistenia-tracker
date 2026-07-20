"use client";

import { useState } from "react";
import Link from "next/link";
import { upcomingDays } from "@/lib/domain/upcoming";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";

const VISIBLE = 2; // mostra os 2 próximos; resto fica colapsado

/** "Próximos treinos": dias do plano a partir de amanhã (exclui hoje). */
export function WeekStrip({ today }: { today: number }) {
  const [expanded, setExpanded] = useState(false);

  const upcoming = upcomingDays(today);

  if (upcoming.length === 0) return null;

  const visible = expanded ? upcoming : upcoming.slice(0, VISIBLE);
  const hidden = upcoming.length - visible.length;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Próximos treinos</h2>
      <ul className="flex flex-col gap-2">
        {visible.map((d) => (
          <li key={d.weekday}>
            <Link
              href={`/treino/${d.weekday}`}
              className="tap flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs"
                style={{ background: d.accent_bg, color: d.accent }}
              >
                {d.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.title}</span>
                <span className="font-mono text-xs text-muted">
                  {durationLabel(d)}
                </span>
              </span>
              <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>

      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="tap mt-2 flex w-full items-center justify-center gap-1 py-2 text-sm text-muted"
        >
          {expanded ? "Mostrar menos" : `Mostrar mais ${hidden}`}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </section>
  );
}
