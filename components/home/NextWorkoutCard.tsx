"use client";

import { useState } from "react";
import Link from "next/link";
import type { Workout } from "@/lib/plan/schema";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";
import {
  ChevronDownIcon,
  PlayIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { accentVars } from "@/components/ui/accent";

/** Hero do painel: o próximo treino da sequência, com CTA de 1 toque e exercícios. */
export function NextWorkoutCard({
  workout,
  activeHere,
  doneToday,
}: {
  /** próximo treino da fila; null enquanto o histórico carrega. */
  workout: Workout | null;
  /** há sessão em andamento deste treino */
  activeHere: boolean;
  /** rótulos dos treinos do plano já concluídos hoje, para o aviso discreto */
  doneToday: string[];
}) {
  const [open, setOpen] = useState(false);
  const factor = useDurationFactor();

  if (!workout) return null;

  const exercises = workout.blocks.flatMap((b) =>
    b.exercises.map((e) => ({ ...e, isSkill: b.is_skill }))
  );

  return (
    <section
      className="anim-fade-in-up glow rounded-card p-5"
      style={{ ...accentVars(workout.accent), background: workout.accent_bg }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: workout.accent, color: "var(--color-on-accent)" }}
        >
          {workout.label}
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel(workout, factor)}</span>
        <span className="font-mono text-xs text-muted">
          · {exercises.length} exercícios
        </span>
      </div>

      <h2 className="display mt-2 text-3xl leading-tight">{workout.title}</h2>

      {doneToday.length > 0 && !activeHere && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CheckIcon className="h-3.5 w-3.5" />
          Hoje já concluído: {doneToday.join(", ")}
        </p>
      )}

      <Link
        href={`/treino/${workout.id}`}
        className="btn-primary tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-center font-semibold"
        style={accentVars(workout.accent)}
      >
        {activeHere ? "Continuar treino" : "Começar treino"}
      </Link>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap mt-2 flex w-full items-center justify-center gap-1 py-2 text-sm text-muted"
      >
        {open ? "Ocultar exercícios" : "Ver exercícios"}
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="anim-fade-in mt-1 flex flex-col gap-1">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <Link
                href={`/treino/${workout.id}?ex=${ex.id}`}
                className="tap flex items-center justify-between gap-3 rounded-lg px-2 py-2 active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium"
                    style={ex.isSkill ? { color: workout.accent } : undefined}
                  >
                    {ex.name}
                  </span>
                  <span className="tnum text-xs text-muted">{ex.target}</span>
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: workout.accent, color: "var(--color-on-accent)" }}
                  aria-label={`Treinar ${ex.name}`}
                >
                  <PlayIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
