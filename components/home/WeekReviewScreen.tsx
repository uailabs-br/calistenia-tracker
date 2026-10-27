"use client";

import { useId, useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import type { WeekReview } from "@/lib/db/queries/weekReview";
import { getWorkoutCampaign } from "@/lib/db/queries/campaign";
import { nextStakeLine, weekHighlights, weekRangeLong } from "@/lib/domain/weekRecap";
import { countAt } from "@/lib/domain/timeline";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { useTimeline } from "@/lib/utils/useTimeline";
import { Portal } from "@/components/ui/Portal";
import { CheckIcon, TrophyIcon, UnlockIcon } from "@/components/ui/icons";
import { accentVars, DEFAULT_ACCENT, themedAccent } from "@/components/ui/accent";
import { WeekDays } from "./WeekDays";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
// Linha do tempo (ms): dias e número primeiro, depois os três números, depois o resto.
const T = { days: 350, tiles: [900, 1000, 1100], highlights: 1350, ahead: 1550, end: 2100 };

/**
 * "Semana passada" em tela cheia, no molde do fim de treino, mas enxuta: cabe
 * numa tela sem rolar e o botão fica sempre à vista. Abre pelo card da home,
 * nunca sozinha: na segunda a pessoa abre o app pra treinar.
 */
export function WeekReviewScreen({
  review,
  streak,
  next,
  onStart,
  onClose,
}: {
  review: WeekReview;
  /** Semanas seguidas batendo a meta (o mesmo número da constância). */
  streak: number;
  next: Workout | null;
  /** "Começar nova semana": dispensa o resumo até a próxima virada. */
  onStart: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useModalA11y<HTMLDivElement>(onClose);
  const t = useTimeline(T.end);
  // Só monta depois de um toque: ler o localStorage aqui não afeta a hidratação.
  const [goals] = useState(getAiGoals);
  const stake = useLiveQuery(
    async () => (next ? ((await getWorkoutCampaign(next, goals))[0] ?? null) : null),
    [next, goals]
  );

  const met = review.sessionsDone >= review.goal;
  // A semana não bateu a meta e a sequência seguiu: foi a proteção do streak.
  const protectionUsed = !met && streak > 0;
  const highlights = weekHighlights(review);
  const delta = review.volumeDeltaPct;

  return (
    <Portal>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="anim-fade-in fixed inset-0 z-40 flex flex-col bg-bg outline-none"
        style={accentVars(themedAccent(DEFAULT_ACCENT))}
      >
        <div
          className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3.5 overflow-y-auto px-4 pb-2"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.75rem)" }}
        >
          <header className="anim-rise" style={at(100)}>
            <p className="eyebrow-lg">{weekRangeLong(review.weekStart, review.weekEnd)}</p>
            <div className="mt-1.5 flex items-center gap-2.5">
              <span
                className={`anim-lit flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${
                  met ? "bg-ac text-on-accent" : "bg-surface2 text-muted"
                }`}
                aria-hidden="true"
              >
                <CheckIcon className="h-5 w-5" />
              </span>
              <h2 id={titleId} className="display-caps text-display leading-none">
                Semana passada
              </h2>
            </div>
          </header>

          <section className="card flex flex-col gap-3 p-3.5" aria-label="Treinos da semana">
            <div>
              <p className="display text-display-xl leading-[0.85] text-ac">
                {countAt(t, review.sessionsDone, T.days, 140 * review.sessionsDone + 300)}
                <span className="text-display text-muted">/{review.goal}</span>
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                {met ? "treinos · meta batida" : "treinos da meta"}
              </p>
            </div>
            <WeekDays days={review.days} animateFrom={T.days} />
          </section>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="card anim-rise min-w-0 px-3 py-2.5" style={at(T.tiles[0])}>
              {delta !== null ? (
                <p className={`display text-3xl leading-none ${delta >= 0 ? "text-success" : "text-warn"}`}>
                  {delta >= 0 ? "+" : "−"}
                  {countAt(t, Math.abs(delta), T.tiles[0] + 50, 800)}%
                </p>
              ) : (
                <p className="display text-3xl leading-none">{countAt(t, review.volume, T.tiles[0] + 50, 800)}</p>
              )}
              <p className="mt-1 font-mono text-2xs leading-snug text-muted">
                {delta !== null ? "volume vs. a anterior" : "volume"}
              </p>
            </div>
            <div className="card anim-rise min-w-0 px-3 py-2.5" style={at(T.tiles[1])}>
              <p className="display text-3xl leading-none">
                {review.avgRpe !== null ? String(review.avgRpe).replace(".", ",") : "–"}
              </p>
              <p className="mt-1 font-mono text-2xs leading-snug text-muted">esforço médio</p>
            </div>
            <div className="card anim-rise min-w-0 px-3 py-2.5" style={at(T.tiles[2])}>
              <p className="display text-3xl leading-none text-ac">{countAt(t, streak, T.tiles[2] + 50, 700)}</p>
              <p className="mt-1 font-mono text-2xs leading-snug text-muted">
                {protectionUsed ? "semanas · usou 1 proteção" : streak === 1 ? "semana seguida" : "semanas seguidas"}
              </p>
            </div>
          </div>

          {highlights.length > 0 && (
            <ul className="card anim-rise" style={at(T.highlights)} aria-label="Destaques">
              {highlights.map((h, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm leading-snug ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="flex w-5 shrink-0 justify-center" aria-hidden="true">
                    {h.kind === "level" ? (
                      <UnlockIcon className="h-[18px] w-[18px] text-ac" />
                    ) : h.kind === "record" ? (
                      <TrophyIcon className="h-[18px] w-[18px] text-gold" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">{h.text}</span>
                </li>
              ))}
            </ul>
          )}

          {next && (
            <section
              className="glow anim-rise flex items-center gap-3 rounded-card bg-ac-bg px-3.5 py-2.5"
              style={at(T.ahead)}
              aria-label="Essa semana"
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ac font-mono text-xs text-on-accent">
                {next.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block">Essa semana</span>
                <span className="mt-0.5 block truncate font-semibold">{next.title}</span>
                {stake && <span className="mt-0.5 block text-sm leading-snug text-muted">{nextStakeLine(stake)}</span>}
              </span>
            </section>
          )}
        </div>

        {/* fora da área que rola: o botão nunca some */}
        <div
          className="mx-auto w-full max-w-md px-4 pt-2.5"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        >
          <button
            type="button"
            onClick={onStart}
            className="btn-primary tap w-full rounded-xl py-3.5 font-medium"
          >
            Começar nova semana
          </button>
        </div>
      </div>
    </Portal>
  );
}
