"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeekStatus } from "@/lib/db/queries/metrics";
import { getWeekGoal } from "@/lib/utils/profile";
import { ProgressRing } from "@/components/ui/ProgressRing";

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg→Dom

/** Constância: anel da meta semanal + streak + mini-calendário da semana. */
export function ConsistencyCard({
  streak,
  weekStatus,
}: {
  streak: number;
  weekStatus: WeekStatus;
}) {
  const [goal, setGoal] = useState(weekStatus.planTotal);
  useEffect(() => {
    setGoal(getWeekGoal() ?? weekStatus.planTotal);
  }, [weekStatus.planTotal]);

  const complete = weekStatus.done >= goal;

  return (
    <Link
      href="/metricas"
      className="tap block rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Constância</p>
          <p className="mt-0.5 text-xs text-muted">
            {complete
              ? "meta da semana batida 🎉"
              : streak > 0
                ? `${streak} ${streak === 1 ? "semana" : "semanas"} seguidas 🔥`
                : "comece sua sequência"}
          </p>
        </div>
        <ProgressRing value={weekStatus.done} total={goal} />
      </div>

      <div className="mt-3 flex justify-between">
        {weekStatus.days.map((d, i) => {
          const base =
            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-mono transition-colors";
          let cls: string;
          let style: React.CSSProperties | undefined;
          if (d.done) {
            cls = `${base} font-semibold`;
            style = { background: "var(--ac)", color: "var(--color-on-accent)" };
          } else if (d.isToday) {
            cls = `${base} border-2`;
            style = { borderColor: "var(--ac)", color: "var(--ac)" };
          } else if (d.isPlanDay) {
            cls = `${base} border border-border text-muted`;
          } else {
            cls = `${base} text-border`;
          }
          return (
            <span key={d.weekday} className={cls} style={style}>
              {DAY_LETTERS[i]}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
