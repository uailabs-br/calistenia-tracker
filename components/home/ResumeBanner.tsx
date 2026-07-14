"use client";

import Link from "next/link";
import type { PlanDay } from "@/lib/plan/schema";
import { ChevronRightIcon } from "@/components/ui/icons";

/** Faixa "continuar treino" — só aparece com sessão em andamento. */
export function ResumeBanner({ day }: { day: PlanDay }) {
  return (
    <Link
      href={`/treino/${day.weekday}`}
      className="tap anim-fade-in-up mb-3 flex items-center justify-between gap-3 rounded-card border px-4 py-3 active:scale-[0.99]"
      style={{ borderColor: day.accent, background: day.accent_bg }}
    >
      <div>
        <p className="font-mono text-xs" style={{ color: day.accent }}>
          Treino em andamento
        </p>
        <p className="mt-0.5 font-semibold">Continuar · {day.title}</p>
      </div>
      <span className="shrink-0" style={{ color: day.accent }}>
        <ChevronRightIcon className="h-5 w-5" />
      </span>
    </Link>
  );
}
