"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import type { Session } from "@/lib/db/schema";
import { getCompletedSessions } from "@/lib/db/queries/sessions";
import { plan, getWorkoutById } from "@/lib/plan/loader";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import {
  shortDate,
  weekStartKey,
  localDateKey,
  formatDuration,
} from "@/lib/utils/date";
import { getWeekHistory, type WeekReview } from "@/lib/db/queries/weekReview";
import { weekHighlights, weekRangeShort } from "@/lib/domain/weekRecap";
import { WeekDays } from "@/components/home/WeekDays";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { HistorySkeleton } from "@/components/ui/Skeleton";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  TrophyIcon,
  UnlockIcon,
} from "@/components/ui/icons";
import { themedAccent } from "@/components/ui/accent";

function SessionRow({
  session,
  nested = false,
}: {
  session: Session;
  nested?: boolean;
}) {
  const isFreeform = session.source === "freeform";
  const day = isFreeform ? undefined : (session.workout_id ? getWorkoutById(session.workout_id) : undefined);
  const duration =
    session.started_at && session.ended_at
      ? formatDuration(session.started_at, session.ended_at)
      : null;
  return (
    <li>
      <Link
        href={`/historico/${session.id}`}
        className={
          nested
            ? "flex items-center justify-between gap-3 rounded-lg bg-surface2 px-3 py-2.5"
            : "flex items-center justify-between gap-3 card px-4 py-3 transition-colors duration-200"
        }
        style={{
          borderLeftColor: isFreeform || !day ? "var(--color-border)" : themedAccent(day.accent),
          borderLeftWidth: 3,
          borderLeftStyle: isFreeform ? "dashed" : "solid",
        }}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">
            {isFreeform ? "Treino avulso" : (day?.title ?? "Treino")}
          </p>
          <p className="tnum text-xs text-muted">
            {shortDate(session.date)}
            {duration && ` · ${duration}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isFreeform && (
            <span className="tnum text-sm" style={day ? { color: themedAccent(day.accent) } : undefined}>
              RPE {session.rpe ?? "-"}
            </span>
          )}
          <ChevronRightIcon className="h-4 w-4 text-muted" />
        </div>
      </Link>
    </li>
  );
}

/** Semana em aberto (ou sem resumo): cabeçalho simples + treinos sempre visíveis. */
function PlainWeek({ label, rows }: { label: string; rows: Session[] }) {
  return (
    <section>
      <p className="eyebrow mb-2">
        {label} · {rows.length} {rows.length === 1 ? "treino" : "treinos"}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map((s) => (
          <SessionRow key={s.id} session={s} />
        ))}
      </ul>
    </section>
  );
}

/**
 * Semana fechada, no formato do resumo da home: período, dias, número contra a
 * meta e até três destaques. Os treinos do dia ficam recolhidos.
 */
function ClosedWeek({ review, rows }: { review: WeekReview; rows: Session[] }) {
  const [open, setOpen] = useState(false);
  const met = review.sessionsDone >= review.goal;
  const highlights = weekHighlights(review);
  const delta = review.volumeDeltaPct;
  return (
    <section>
      <div className="card flex flex-col gap-3 px-4 py-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="eyebrow">{weekRangeShort(review.weekStart, review.weekEnd)}</p>
            <p className="display mt-1 text-3xl leading-none">
              <span className={met ? "text-ac" : ""}>{review.sessionsDone}</span>
              <span className="text-xl text-muted">/{review.goal}</span>
            </p>
            <p className="mt-1 font-mono text-2xs text-muted">
              {met ? "meta batida" : "treinos da meta"}
              {delta !== null && ` · vol ${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)}%`}
              {review.avgRpe !== null && ` · rpe ${String(review.avgRpe).replace(".", ",")}`}
            </p>
          </div>
          <div className="w-36 shrink-0">
            <WeekDays days={review.days} size="sm" />
          </div>
        </div>

        {highlights.length > 0 && (
          <ul className="flex flex-col gap-1.5 border-t border-border pt-2.5 text-sm leading-snug">
            {highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex w-4 shrink-0 justify-center" aria-hidden="true">
                  {h.kind === "level" ? (
                    <UnlockIcon className="h-4 w-4 text-ac" />
                  ) : h.kind === "record" ? (
                    <TrophyIcon className="h-4 w-4 text-gold" />
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-warn" />
                  )}
                </span>
                <span className="min-w-0 flex-1">{h.text}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap -my-1 -ml-1 inline-flex items-center gap-1 self-start text-xs text-muted active:opacity-70"
        >
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {open ? "ocultar treinos" : `ver treinos (${rows.length})`}
        </button>
        {open && (
          <ul className="flex flex-col gap-2 border-t border-border pt-3">
            {rows.map((s) => (
              <SessionRow key={s.id} session={s} nested />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function HistoricoPage() {
  // mais recente primeiro
  const sessions = useLiveQuery(async () => (await getCompletedSessions()).reverse(), []);
  const weekHistory = useLiveQuery(() => getWeekHistory(), []);

  // Agrupa por semana (segunda-feira), preservando a ordem decrescente.
  const groups =
    sessions === undefined
      ? undefined
      : (() => {
          const map = new Map<string, Session[]>();
          for (const s of sessions) {
            const key = weekStartKey(s.date);
            const arr = map.get(key) ?? [];
            arr.push(s);
            map.set(key, arr);
          }
          return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
        })();

  const reviewByWeek = new Map((weekHistory ?? []).map((r) => [r.weekStart, r]));
  const currentKey = weekStartKey(localDateKey());
  const planReady = usePlanReady();

  return (
    <div className="px-4">
      <BackLink href="/metricas" label="Evolução" />
      <PageHeader title="Histórico" subtitle={planReady ? plan.name : undefined} />
      {groups === undefined ? (
        <HistorySkeleton />
      ) : groups.length === 0 ? (
        <p className="mt-8 text-center text-muted">
          Nenhuma sessão registrada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([weekKey, rows]) => {
            const review = reviewByWeek.get(weekKey);
            if (weekKey === currentKey || !review) {
              return (
                <PlainWeek
                  key={weekKey}
                  label={
                    weekKey === currentKey
                      ? "Esta semana"
                      : `Semana de ${shortDate(weekKey)}`
                  }
                  rows={rows}
                />
              );
            }
            return <ClosedWeek key={weekKey} review={review} rows={rows} />;
          })}
        </div>
      )}
    </div>
  );
}
