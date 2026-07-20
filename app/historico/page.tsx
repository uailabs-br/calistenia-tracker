"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Session } from "@/lib/db/schema";
import { plan, getDayByWeekday } from "@/lib/plan/loader";
import {
  shortDate,
  weekStartKey,
  localDateKey,
  formatDuration,
} from "@/lib/utils/date";
import {
  getWeekHistory,
  buildWeekReviewTexts,
  type WeekReview,
} from "@/lib/db/queries/weekReview";
import { PageHeader } from "@/components/ui/PageHeader";
import { HistorySkeleton } from "@/components/ui/Skeleton";
import { ChevronRightIcon, ChevronDownIcon } from "@/components/ui/icons";

function SessionRow({
  session,
  nested = false,
}: {
  session: Session;
  nested?: boolean;
}) {
  const day = getDayByWeekday(session.weekday);
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
            : "flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors duration-200"
        }
        style={{ borderLeftColor: day?.accent, borderLeftWidth: 3 }}
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{day?.title ?? "Treino"}</p>
          <p className="tnum text-xs text-muted">
            {shortDate(session.date)}
            {duration && ` · ${duration}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="tnum text-sm" style={{ color: day?.accent }}>
            RPE {session.rpe ?? "-"}
          </span>
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
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
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

/** Semana fechada: card de resumo + treinos do dia recolhíveis. */
function ClosedWeek({ review, rows }: { review: WeekReview; rows: Session[] }) {
  const [open, setOpen] = useState(false);
  const texts = buildWeekReviewTexts(review);
  return (
    <section>
      <div className="rounded-card border border-border bg-surface px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
            Semana de {shortDate(review.weekStart)}
          </span>
          <span className="tnum text-sm font-semibold">
            {review.daysDone}/{review.planTotal}
            {review.volumeDeltaPct !== null && (
              <span className="ml-2 text-xs font-normal text-muted">
                vol {review.volumeDeltaPct > 0 ? "+" : ""}
                {review.volumeDeltaPct}%
              </span>
            )}
            {review.avgRpe !== null && (
              <span className="ml-2 text-xs font-normal text-muted">
                rpe {review.avgRpe}
              </span>
            )}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">{texts.good}</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="tap -ml-1 mt-2 inline-flex items-center gap-1 text-xs text-muted active:opacity-70"
        >
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {open ? "ocultar treinos" : `ver treinos (${rows.length})`}
        </button>
        {open && (
          <ul className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
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
  const sessions = useLiveQuery(async () => {
    const rows = await db.sessions.where("status").equals("completed").toArray();
    return rows
      .filter((s) => !s.deleted_at)
      .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));
  }, []);
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

  return (
    <div className="px-4">
      <PageHeader title="Histórico" subtitle={plan.name} />
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
