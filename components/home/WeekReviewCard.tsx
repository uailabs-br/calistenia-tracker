"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import { getWeekReview } from "@/lib/db/queries/weekReview";
import { weekRangeShort } from "@/lib/domain/weekRecap";
import { localDateKey, weekStartKey } from "@/lib/utils/date";
import { WeekDays } from "./WeekDays";
import { WeekReviewScreen } from "./WeekReviewScreen";

const SEEN_KEY = "calistenia:week-review-seen";

/**
 * Resumo da semana passada na home: número contra a meta, os dias e o que
 * houve de destaque, num olhar. O detalhe abre em tela cheia pelo botão, nunca
 * sozinho. Some quando a pessoa toca em "Começar nova semana" ou conclui o
 * primeiro treino da semana nova: dali em diante o resumo não tem mais o que
 * fazer na home. MVP 100% local.
 */
export function WeekReviewCard({
  streak,
  weekStarted,
  next,
}: {
  /** Semanas seguidas batendo a meta (o mesmo número da constância). */
  streak: number;
  /** Já tem treino concluído na semana corrente. */
  weekStarted: boolean;
  /** Próximo treino da fila, pro "Essa semana". */
  next: Workout | null;
}) {
  // undefined = ainda não leu o localStorage (evita flash no SSR/hidratação)
  const [seen, setSeen] = useState<string | null | undefined>(undefined);
  useEffect(() => setSeen(localStorage.getItem(SEEN_KEY)), []);
  const [open, setOpen] = useState(false);

  const review = useLiveQuery(() => getWeekReview(), []);
  const currentWeek = weekStartKey(localDateKey());

  if (seen === undefined || !review || seen === currentWeek || weekStarted) return null;

  const start = () => {
    localStorage.setItem(SEEN_KEY, currentWeek);
    setSeen(currentWeek);
    setOpen(false);
  };

  const met = review.sessionsDone >= review.goal;
  const delta = review.volumeDeltaPct;

  return (
    <section className="card glow anim-fade-in-up flex flex-col gap-3.5 bg-ac-bg p-4">
      <p className="eyebrow -mb-1">Semana passada · {weekRangeShort(review.weekStart, review.weekEnd)}</p>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="display text-display-lg leading-[0.85] text-ac">
            {review.sessionsDone}
            <span className="text-3xl text-muted">/{review.goal}</span>
          </p>
          <p className="mt-1 font-mono text-xs text-muted">
            {met ? "meta batida" : "treinos da meta"}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <WeekDays days={review.days} size="sm" />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {review.records.length > 0 && (
          <span className="rounded-full bg-gold/14 px-2.5 py-0.5 font-mono text-xs text-gold">
            {review.records.length} {review.records.length === 1 ? "recorde" : "recordes"}
          </span>
        )}
        {review.levelsClosed.length > 0 && (
          <span className="rounded-full bg-ac/14 px-2.5 py-0.5 font-mono text-xs text-ac">
            {review.levelsClosed.length}{" "}
            {review.levelsClosed.length === 1 ? "nível concluído" : "níveis concluídos"}
          </span>
        )}
        {delta !== null && (
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-muted">
            {delta > 0 ? "+" : delta < 0 ? "−" : ""}
            {Math.abs(delta)}% volume
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary tap w-full rounded-xl py-3 font-medium"
      >
        Ver a semana passada
      </button>

      {open && (
        <WeekReviewScreen
          review={review}
          streak={streak}
          next={next}
          onStart={start}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
