"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workout } from "@/lib/plan/schema";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";

const VISIBLE = 2; // mostra os 2 seguintes; resto fica colapsado

/** "Depois": os treinos seguintes na sequência, a partir do que vem depois do próximo. */
export function UpNext({ queue }: { queue: Workout[] }) {
  const [expanded, setExpanded] = useState(false);

  if (queue.length === 0) return null;

  const visible = expanded ? queue : queue.slice(0, VISIBLE);
  const hidden = queue.length - visible.length;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">Depois</h2>
      <ul className="flex flex-col gap-2">
        {visible.map((w) => (
          <li key={w.id}>
            <Link
              href={`/treino/${w.id}`}
              className="card tap flex items-center gap-3 px-4 py-3 active:scale-[0.99]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs"
                style={{ background: w.accent_bg, color: w.accent }}
              >
                {w.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{w.title}</span>
                <span className="font-mono text-xs text-muted">
                  {durationLabel(w)}
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
