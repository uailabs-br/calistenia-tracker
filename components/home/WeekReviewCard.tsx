"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  getWeekReview,
  buildWeekReviewTexts,
} from "@/lib/db/queries/weekReview";
import { localDateKey, shortDate, weekStartKey } from "@/lib/utils/date";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";

const SEEN_KEY = "calistenia:week-review-seen";

/**
 * Feedback semanal: aparece na primeira abertura de cada semana nova, com o
 * resumo da semana anterior (o que foi bom, o que melhorar, frase contextual).
 * Dispensado, só volta na próxima virada de semana. MVP 100% local.
 */
export function WeekReviewCard() {
  // undefined = ainda não leu o localStorage (evita flash no SSR/hidratação)
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => setSeen(localStorage.getItem(SEEN_KEY)), []);

  const review = useLiveQuery(() => getWeekReview(), []);
  const currentWeek = weekStartKey(localDateKey());

  if (seen === undefined || !review || seen === currentWeek) return null;

  const t = buildWeekReviewTexts(review);
  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, currentWeek);
    setSeen(currentWeek);
  };

  const volumeStat =
    review.volumeDeltaPct !== null
      ? `${review.volumeDeltaPct > 0 ? "+" : ""}${review.volumeDeltaPct}%`
      : String(review.volume);

  return (
    <section className="anim-fade-in-up rounded-card border border-border bg-surface px-4 py-4">
      <p className="font-mono text-xs uppercase tracking-wide text-muted">
        Resumo da semana · {shortDate(review.weekStart)}–
        {shortDate(review.weekEnd)}
      </p>

      <div className="mt-3 flex gap-4">
        <div>
          <p className="tnum text-lg font-semibold leading-none">
            {review.daysDone}/{review.planTotal}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
            treinos
          </p>
        </div>
        <div>
          <p className="tnum text-lg font-semibold leading-none">
            {volumeStat}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
            {review.volumeDeltaPct !== null ? "volume vs. ant." : "volume"}
          </p>
        </div>
        {review.avgRpe !== null && (
          <div>
            <p className="tnum text-lg font-semibold leading-none">
              {review.avgRpe}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted">
              rpe médio
            </p>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        <li className="flex items-start gap-2">
          <span
            className="mt-0.5 shrink-0"
            style={{ color: "var(--color-success)" }}
          >
            <CheckIcon className="h-4 w-4" />
          </span>
          <span>{t.good}</span>
        </li>
        {t.improve && (
          <li className="flex items-start gap-2">
            <span
              className="mt-0.5 shrink-0"
              style={{ color: "var(--color-warn)" }}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </span>
            <span>{t.improve}</span>
          </li>
        )}
      </ul>

      <p className="mt-3 text-sm italic text-muted">{t.phrase}</p>

      <button
        type="button"
        onClick={dismiss}
        className="tap mt-4 w-full rounded-xl border border-border bg-surface2 py-2.5 text-sm font-medium"
      >
        Ok, bora pra essa semana
      </button>
    </section>
  );
}
