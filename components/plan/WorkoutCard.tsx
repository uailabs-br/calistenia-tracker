"use client";

import { useId } from "react";
import Link from "next/link";
import type { Workout } from "@/lib/plan/schema";
import { accentVars, themedAccent, themedAccentBg } from "@/components/ui/accent";
import { Sheet } from "@/components/ui/Modal";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";
import { ChevronRightIcon } from "@/components/ui/icons";

function exerciseCount(workout: Workout): number {
  return workout.blocks.reduce((n, b) => n + b.exercises.length, 0);
}

function NextTag({ workout }: { workout: Workout }) {
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 font-mono text-3xs uppercase tracking-wide"
      style={{ background: themedAccentBg(workout.accent_bg), color: themedAccent(workout.accent) }}
    >
      próximo
    </span>
  );
}

function LabelBadge({ workout, className }: { workout: Workout; className: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-mono text-xs ${className}`}
      style={{ background: themedAccentBg(workout.accent_bg), color: themedAccent(workout.accent) }}
    >
      {workout.label}
    </span>
  );
}

/**
 * Um treino do plano na fila horizontal da aba Treino. Só o essencial: os
 * exercícios abrem na WorkoutSheet, pra fila inteira caber numa linha em vez
 * de empilhar um card por treino.
 */
export function WorkoutCard({
  workout,
  next,
  onOpen,
}: {
  workout: Workout;
  next: boolean;
  onOpen: () => void;
}) {
  const factor = useDurationFactor();
  const count = exerciseCount(workout);

  return (
    <li className="shrink-0" data-workout={workout.id}>
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="card tap flex w-[8.25rem] flex-col gap-2 p-3 text-left active:scale-[0.97]"
        style={{ borderColor: next ? themedAccent(workout.accent) : "var(--color-border)" }}
      >
        <span className="flex w-full items-center justify-between gap-1.5">
          <LabelBadge workout={workout} className="h-7 w-7" />
          {next && <NextTag workout={workout} />}
        </span>
        <span className="line-clamp-2 min-h-[2.5em] text-sm font-medium leading-tight">
          {workout.title}
        </span>
        <span className="font-mono text-2xs text-muted">
          {durationLabel(workout, factor)} · {count} ex.
        </span>
      </button>
    </li>
  );
}

/**
 * Os exercícios de um treino por bloco, com o alvo. É consulta, não sessão —
 * por isso não tem os botões de play da home, só uma saída discreta pra começar.
 */
export function WorkoutSheet({
  workout,
  next,
  onClose,
}: {
  workout: Workout;
  next: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const factor = useDurationFactor();
  const count = exerciseCount(workout);

  return (
    <Sheet
      labelledBy={titleId}
      onClose={onClose}
      className="max-h-[85dvh] overflow-y-auto px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      style={accentVars(workout.accent)}
    >
      <div className="mb-4 flex items-center gap-3">
        <LabelBadge workout={workout} className="h-8 w-8" />
        <span className="min-w-0 flex-1">
          <h2 id={titleId} className="text-lg font-semibold leading-tight">
            {workout.title}
          </h2>
          <span className="font-mono text-xs text-muted">
            {durationLabel(workout, factor)} · {count} {count === 1 ? "exercício" : "exercícios"}
          </span>
        </span>
        {next && <NextTag workout={workout} />}
      </div>

      {workout.blocks.map((block, i) => (
        <section key={`${block.label}-${i}`} className={i > 0 ? "mt-3" : undefined}>
          <p className="eyebrow mb-1">{block.label}</p>
          <ul>
            {block.exercises.map((ex) => (
              <li key={ex.id} className="flex items-baseline justify-between gap-3 py-1">
                <span className={`min-w-0 truncate text-sm ${block.is_skill ? "text-ac" : ""}`}>
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
        className="tap -mx-1 mt-3 flex items-center justify-between rounded-lg px-1 py-2 text-sm font-medium text-ac"
      >
        Começar este treino
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </Sheet>
  );
}
