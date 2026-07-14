"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan, getDayByWeekday } from "@/lib/plan/loader";
import { shortDate, weekStartKey, formatDuration } from "@/lib/utils/date";
import { PageHeader } from "@/components/ui/PageHeader";
import { HistorySkeleton } from "@/components/ui/Skeleton";
import { ChevronRightIcon } from "@/components/ui/icons";

export default function HistoricoPage() {
  const sessions = useLiveQuery(async () => {
    const rows = await db.sessions.where("status").equals("completed").toArray();
    return rows
      .filter((s) => !s.deleted_at)
      .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));
  }, []);

  // Agrupa por semana (segunda-feira), preservando a ordem decrescente.
  const groups =
    sessions === undefined
      ? undefined
      : (() => {
          const map = new Map<string, typeof sessions>();
          for (const s of sessions) {
            const key = weekStartKey(s.date);
            const arr = map.get(key) ?? [];
            arr.push(s);
            map.set(key, arr);
          }
          return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
        })();

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
          {groups.map(([weekKey, rows]) => (
            <section key={weekKey}>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                Semana de {shortDate(weekKey)} · {rows.length}{" "}
                {rows.length === 1 ? "treino" : "treinos"}
              </p>
              <ul className="flex flex-col gap-2">
                {rows.map((s) => {
                  const day = getDayByWeekday(s.weekday);
                  const duration =
                    s.started_at && s.ended_at
                      ? formatDuration(s.started_at, s.ended_at)
                      : null;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/historico/${s.id}`}
                        className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3 transition-colors duration-200"
                        style={{ borderLeftColor: day?.accent, borderLeftWidth: 3 }}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {day?.title ?? "Treino"}
                          </p>
                          <p className="tnum text-xs text-muted">
                            {shortDate(s.date)}
                            {duration && ` · ${duration}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="tnum text-sm"
                            style={{ color: day?.accent }}
                          >
                            RPE {s.rpe ?? "-"}
                          </span>
                          <ChevronRightIcon className="h-4 w-4 text-muted" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
