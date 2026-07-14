"use client";

import Link from "next/link";
import type { WeekStatus } from "@/lib/db/queries/metrics";

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg→Dom

/** Constância: streak de semanas + mini-calendário da semana atual. */
export function ConsistencyCard({
  streak,
  weekStatus,
}: {
  streak: number;
  weekStatus: WeekStatus;
}) {
  return (
    <Link
      href="/metricas"
      className="tap block rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Constância</p>
          <p className="mt-0.5 text-xs text-muted">
            {streak > 0
              ? `${streak} ${streak === 1 ? "semana" : "semanas"} seguidas 🔥`
              : "comece sua sequência"}
          </p>
        </div>
        <p className="tnum text-3xl font-semibold" style={{ color: "var(--ac)" }}>
          {weekStatus.done}
          <span className="text-base text-muted">/{weekStatus.planTotal}</span>
        </p>
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
