"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workout } from "@/lib/plan/schema";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";

/**
 * Um treino do plano na aba Treino: fechado mostra o essencial, aberto mostra
 * os exercícios por bloco com o alvo. É consulta, não sessão — por isso não
 * tem os botões de play da home, só uma saída discreta pra começar.
 */
export function WorkoutCard({ workout, next }: { workout: Workout; next: boolean }) {
  const [open, setOpen] = useState(false);
  const factor = useDurationFactor();
  const count = workout.blocks.reduce((n, b) => n + b.exercises.length, 0);

  return (
    <li
      className="overflow-hidden rounded-card border bg-surface"
      style={{ borderColor: next ? workout.accent : "var(--color-border)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs"
          style={{ background: workout.accent_bg, color: workout.accent }}
        >
          {workout.label}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{workout.title}</span>
          <span className="font-mono text-xs text-muted">
            {durationLabel(workout, factor)} · {count} {count === 1 ? "exercício" : "exercícios"}
          </span>
        </span>
        {next && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 font-mono text-3xs uppercase tracking-wide"
            style={{ background: workout.accent_bg, color: workout.accent }}
          >
            próximo
          </span>
        )}
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="anim-fade-in border-t border-border px-4 pb-3 pt-3">
          {workout.blocks.map((block, i) => (
            <section key={`${block.label}-${i}`} className={i > 0 ? "mt-3" : undefined}>
              <p className="eyebrow mb-1">
                {block.label}
              </p>
              <ul>
                {block.exercises.map((ex) => (
                  <li key={ex.id} className="flex items-baseline justify-between gap-3 py-1">
                    <span
                      className="min-w-0 truncate text-sm"
                      style={block.is_skill ? { color: workout.accent } : undefined}
                    >
                      {ex.name}
                    </span>
                    <span className="tnum shrink-0 text-xs text-muted">{ex.target}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <Link
            href={`/treino/${workout.id}`}
            className="tap -mx-1 mt-2 flex items-center justify-between rounded-lg px-1 py-2 text-sm font-medium"
            style={{ color: workout.accent }}
          >
            Começar este treino
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </li>
  );
}
