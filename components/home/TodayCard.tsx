"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlanDay } from "@/lib/plan/schema";
import { plan } from "@/lib/plan/loader";
import { durationLabel } from "@/lib/domain/estimateDuration";
import {
  ChevronDownIcon,
  PlayIcon,
  CheckIcon,
} from "@/components/ui/icons";

/** Hero do painel: o treino de hoje, com CTA de 1 toque e exercícios. */
export function TodayCard({
  day,
  today,
  completedToday,
  activeToday,
}: {
  /** dia de plano de hoje, ou null se hoje é folga. */
  day: PlanDay | null;
  today: number;
  completedToday: boolean;
  activeToday: boolean;
}) {
  const [open, setOpen] = useState(false);

  // Folga: sem treino previsto hoje.
  if (!day) {
    const first = plan.days[0];
    return (
      <section className="anim-fade-in-up rounded-card border border-border bg-surface px-5 py-6 text-center">
        <p className="text-3xl">💤</p>
        <h2 className="mt-2 text-lg font-semibold">Folga hoje</h2>
        <p className="mt-1 text-sm text-muted">Descanso faz parte do plano.</p>
        <Link
          href={`/treino/${first.weekday}`}
          className="tap mt-3 inline-block text-sm font-medium"
          style={{ color: "var(--ac)" }}
        >
          Treinar mesmo assim →
        </Link>
      </section>
    );
  }

  const exercises = day.blocks.flatMap((b) =>
    b.exercises.map((e) => ({ ...e, isSkill: b.is_skill }))
  );

  // Concluído (e sem sessão em andamento): o destaque é a conclusão;
  // "treinar de novo" vira link discreto. Retomar sessão ativa segue como CTA.
  const doneState = completedToday && !activeToday;
  const ctaLabel = activeToday ? "Continuar treino" : "Começar treino";

  return (
    <section
      className="anim-fade-in-up rounded-card border p-5"
      style={{ borderColor: day.accent, background: day.accent_bg }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: day.accent, color: "var(--color-on-accent)" }}
        >
          {day.label}
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel(day)}</span>
        <span className="font-mono text-xs text-muted">
          · {exercises.length} exercícios
        </span>
      </div>

      <h2 className="mt-2 text-2xl font-semibold leading-tight">{day.title}</h2>

      {doneState ? (
        <>
          <div
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-3.5 font-semibold"
            style={{ borderColor: day.accent, color: day.accent }}
          >
            <CheckIcon className="h-5 w-5" /> Treino concluído
          </div>
          <Link
            href={`/treino/${today}`}
            className="tap mt-1 flex w-full items-center justify-center py-2 text-sm text-muted"
          >
            Treinar de novo →
          </Link>
        </>
      ) : (
        <Link
          href={`/treino/${today}`}
          className="tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-center font-semibold active:scale-[0.99]"
          style={{ background: day.accent, color: "var(--color-on-accent)" }}
        >
          {ctaLabel}
        </Link>
      )}

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
                href={`/treino/${today}?ex=${ex.id}`}
                className="tap flex items-center justify-between gap-3 rounded-lg px-2 py-2 active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium"
                    style={ex.isSkill ? { color: day.accent } : undefined}
                  >
                    {ex.name}
                  </span>
                  <span className="tnum text-xs text-muted">{ex.target}</span>
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: day.accent, color: "var(--color-on-accent)" }}
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
