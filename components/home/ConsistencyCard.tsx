"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { WeekStatus } from "@/lib/db/queries/metrics";
import { getWeekGoal } from "@/lib/utils/profile";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SegmentGauge } from "@/components/ui/SegmentGauge";

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg→Dom

/**
 * Constância: anel da meta semanal + streak + mini-calendário da semana.
 * O tema futurista troca o anel pelo SegmentGauge, à esquerda, e mostra quanto
 * falta: os dois desenhos vão no HTML e o CSS escolhe (classes `consistency-*`).
 */
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
  const left = Math.max(0, goal - weekStatus.done);

  return (
    <Link
      href="/metricas"
      className="card tap block px-4 py-3 active:scale-[0.99]"
    >
      <div className="consistency-head flex items-center justify-between">
        <SegmentGauge value={weekStatus.done} total={goal} className="consistency-gauge hidden" />
        <div>
          <p className="consistency-title text-sm font-semibold">Constância</p>
          <p className="consistency-sub mt-0.5 text-xs text-muted">
            {complete
              ? "meta da semana batida 🎉"
              : streak > 0
                ? `${streak} ${streak === 1 ? "semana" : "semanas"} seguidas 🔥`
                : "sua sequência começa aqui 💪"}
          </p>
          {left > 0 && (
            <p className="consistency-left mt-0.5 hidden text-xs text-muted">
              {left === 1 ? "falta 1 treino" : `faltam ${left} treinos`} pra fechar a semana
            </p>
          )}
        </div>
        <div className="consistency-ring">
          <ProgressRing value={weekStatus.done} total={goal} size={60} stroke={5} />
        </div>
      </div>

      {weekStatus.freeformCount > 0 && (
        <p className="mt-2 text-xs text-muted">
          {weekStatus.done - weekStatus.freeformCount} do programa +{" "}
          {weekStatus.freeformCount}{" "}
          {weekStatus.freeformCount === 1 ? "avulso" : "avulsos"}
        </p>
      )}

      <div className="consistency-days mt-3 flex justify-between">
        {weekStatus.days.map((d, i) => {
          const base =
            "consistency-day flex h-7 w-7 items-center justify-center rounded-full text-2xs font-mono transition-colors";
          let cls: string;
          // data-done: o futurista acende o dia feito sem ler a cor inline.
          let style: React.CSSProperties | undefined;
          if (d.source === "freeform") {
            cls = `${base} border-2 border-dashed font-semibold`;
            style = { borderColor: "var(--ac)", color: "var(--ac)" };
          } else if (d.done) {
            cls = `${base} font-semibold`;
            style = { background: "var(--ac)", color: "var(--color-on-accent)" };
          } else if (d.isToday) {
            cls = `${base} border-2`;
            style = { borderColor: "var(--ac)", color: "var(--ac)" };
          } else {
            cls = `${base} border border-border text-muted`;
          }
          return (
            <span key={d.weekday} className={cls} style={style} data-done={d.done || undefined}>
              {DAY_LETTERS[i]}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
