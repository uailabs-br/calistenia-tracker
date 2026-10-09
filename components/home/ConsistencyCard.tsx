"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeekStatus } from "@/lib/db/queries/metrics";
import { getWeekGoal } from "@/lib/utils/profile";
import { ProgressRing } from "@/components/ui/ProgressRing";

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg→Dom

/** Glow neon na cor do treino (--ac). Spread >= 0: com spread negativo a sombra
 *  fica menor que o círculo de 28px e o brilho some atrás dele. */
const GLOW =
  "0 0 7px 1px color-mix(in oklab, var(--ac) 50%, transparent), 0 0 16px 2px color-mix(in oklab, var(--ac) 20%, transparent)";
const GLOW_SOFT =
  "0 0 6px 0 color-mix(in oklab, var(--ac) 32%, transparent), inset 0 0 5px 0 color-mix(in oklab, var(--ac) 18%, transparent)";

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
                : "sua sequência começa aqui 💪"}
          </p>
        </div>
        <ProgressRing value={weekStatus.done} total={goal} size={60} stroke={5} />
      </div>

      {weekStatus.freeformCount > 0 && (
        <p className="mt-2 text-xs text-muted">
          {weekStatus.done - weekStatus.freeformCount} do programa +{" "}
          {weekStatus.freeformCount}{" "}
          {weekStatus.freeformCount === 1 ? "avulso" : "avulsos"}
        </p>
      )}

      <div className="mt-3 flex justify-between">
        {weekStatus.days.map((d, i) => {
          const base =
            "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-mono transition-colors";
          let cls: string;
          let style: React.CSSProperties | undefined;
          if (d.source === "freeform") {
            cls = `${base} border-2 border-dashed font-semibold`;
            style = { borderColor: "var(--ac)", color: "var(--ac)", boxShadow: GLOW_SOFT };
          } else if (d.done) {
            cls = `${base} font-semibold`;
            style = { background: "var(--ac)", color: "var(--color-on-accent)", boxShadow: GLOW };
          } else if (d.isToday) {
            cls = `${base} border-2`;
            style = { borderColor: "var(--ac)", color: "var(--ac)", boxShadow: GLOW_SOFT };
          } else {
            cls = `${base} border border-border text-muted`;
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
