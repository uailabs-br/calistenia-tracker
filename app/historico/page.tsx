"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { plan, getDayByWeekday } from "@/lib/plan/loader";
import { shortDate } from "@/lib/utils/date";
import { PageHeader } from "@/components/ui/PageHeader";

export default function HistoricoPage() {
  const sessions = useLiveQuery(async () => {
    const rows = await db.sessions
      .where("status")
      .equals("completed")
      .toArray();
    return rows
      .filter((s) => !s.deleted_at)
      .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0));
  }, []);

  return (
    <div className="px-4">
      <PageHeader title="Histórico" subtitle={plan.name} />
      {sessions === undefined ? (
        <p className="text-muted">Carregando…</p>
      ) : sessions.length === 0 ? (
        <p className="mt-8 text-center text-muted">
          Nenhuma sessão registrada ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((s) => {
            const day = getDayByWeekday(s.weekday);
            return (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3"
                style={{ borderLeftColor: day?.accent, borderLeftWidth: 3 }}
              >
                <div>
                  <p className="font-medium">{day?.title ?? "Treino"}</p>
                  <p className="tnum text-xs text-muted">
                    {shortDate(s.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tnum text-sm" style={{ color: day?.accent }}>
                    RPE {s.rpe ?? "—"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
