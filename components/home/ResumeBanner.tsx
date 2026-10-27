"use client";

import Link from "next/link";
import type { Workout } from "@/lib/plan/schema";
import { themedAccent, themedAccentBg } from "@/components/ui/accent";
import { ChevronRightIcon } from "@/components/ui/icons";

/** Faixa "continuar treino" — só aparece com sessão em andamento. */
export function ResumeBanner({ workout }: { workout: Workout }) {
  return (
    <Link
      href={`/treino/${workout.id}`}
      className="tap anim-fade-in-up flex items-center justify-between gap-3 rounded-card border px-4 py-3 active:scale-[0.99]"
      style={{ borderColor: themedAccent(workout.accent), background: themedAccentBg(workout.accent_bg) }}
    >
      <div>
        <p className="font-mono text-xs" style={{ color: themedAccent(workout.accent) }}>
          Treino em andamento
        </p>
        <p className="mt-0.5 font-semibold">Continuar · {workout.title}</p>
      </div>
      <span className="shrink-0" style={{ color: themedAccent(workout.accent) }}>
        <ChevronRightIcon className="h-5 w-5" />
      </span>
    </Link>
  );
}
