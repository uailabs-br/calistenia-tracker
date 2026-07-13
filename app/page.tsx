"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getDayByWeekday } from "@/lib/plan/loader";
import { getActiveSession, createSession } from "@/lib/db/repositories/sessions";
import { weekdayOf, localDateKey } from "@/lib/utils/date";
import { DayHeader } from "@/components/session/DayHeader";
import { EmptyDay } from "@/components/session/EmptyDay";
import { SessionRunner } from "@/components/session/SessionRunner";

const WEEKDAY_NAMES = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export default function TodayPage() {
  const [starting, setStarting] = useState(false);
  const weekday = weekdayOf();
  const today = localDateKey();
  const day = getDayByWeekday(weekday);

  const active = useLiveQuery(() => getActiveSession(), []);
  const completedToday = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(today).toArray();
    return rows.find(
      (s) => s.status === "completed" && !s.deleted_at && s.weekday === weekday
    );
  }, [today, weekday]);

  if (!day) {
    return <EmptyDay weekdayLabel={WEEKDAY_NAMES[weekday]} />;
  }

  // Sessão em andamento → runner (retomada vem do banco)
  if (active) {
    return (
      <div style={{ ["--ac" as string]: day.accent }}>
        <div className="px-4">
          <DayHeader day={day} />
        </div>
        <SessionRunner
          session={active}
          day={day}
          onFinished={() => { /* useLiveQuery re-renderiza sozinho */ }}
        />
      </div>
    );
  }

  const start = async () => {
    setStarting(true);
    await createSession(weekday);
    // useLiveQuery detecta a nova sessão e troca para o runner
  };

  return (
    <div className="px-4">
      <DayHeader day={day} />

      {completedToday && (
        <div
          className="mb-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: day.accent, color: day.accent }}
        >
          Treino de hoje já registrado. Começar de novo cria uma nova sessão.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {day.blocks.map((block) => (
          <li key={block.label}>
            <p className="mb-1 mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              {block.label}
            </p>
            <ul className="flex flex-col gap-2">
              {block.exercises.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-card border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-medium"
                      style={block.is_skill ? { color: day.accent } : undefined}
                    >
                      {ex.name}
                    </span>
                    <span className="tnum shrink-0 text-sm text-muted">
                      {ex.target}
                    </span>
                  </div>
                  {ex.obs && (
                    <p className="mt-1 text-xs leading-snug text-muted">
                      {ex.obs}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="tap fixed inset-x-0 bottom-[76px] z-20 mx-auto w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] rounded-xl py-4 text-center font-semibold shadow-lg transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{ background: day.accent, color: "#0e0e0f" }}
      >
        {starting ? "abrindo…" : completedToday ? "Treinar de novo" : "Começar"}
      </button>
      <div className="h-16" />
    </div>
  );
}
