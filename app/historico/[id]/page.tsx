"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ExerciseLog } from "@/lib/db/schema";
import { getDayByWeekday } from "@/lib/plan/loader";
import type { PlanExercise } from "@/lib/plan/schema";
import { effectiveSets } from "@/lib/domain/volume";
import { longDate, formatDuration } from "@/lib/utils/date";
import { ChevronLeftIcon, CheckIcon } from "@/components/ui/icons";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(id);
    if (!session || session.deleted_at) return null;
    const logs = (
      await db.exerciseLogs.where("session_id").equals(id).toArray()
    ).filter((l) => !l.deleted_at);
    return { session, logs };
  }, [id]);

  const backLink = (
    <Link
      href="/historico"
      className="tap -ml-2 mb-2 inline-flex items-center gap-1 pt-6 text-sm text-muted"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Histórico
    </Link>
  );

  if (data === undefined) {
    return <div className="px-4">{backLink}</div>;
  }

  if (data === null) {
    return (
      <div className="px-4">
        {backLink}
        <p className="mt-8 text-center text-muted">Sessão não encontrada.</p>
      </div>
    );
  }

  const { session, logs } = data;
  const day = getDayByWeekday(session.weekday);
  const accent = day?.accent ?? "#a89cff";
  const duration =
    session.started_at && session.ended_at
      ? formatDuration(session.started_at, session.ended_at)
      : null;

  const logByExercise = new Map<string, ExerciseLog>();
  logs.forEach((l) => logByExercise.set(l.exercise_id, l));

  return (
    <div className="px-4 pb-8">
      {backLink}

      <header className="pt-1 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-xs"
            style={{ background: day?.accent_bg, color: accent }}
          >
            {day?.label ?? "Treino"}
          </span>
          {duration && (
            <span className="font-mono text-xs text-muted">{duration}</span>
          )}
          <span className="tnum font-mono text-xs" style={{ color: accent }}>
            RPE {session.rpe ?? "-"}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          {day?.title ?? "Treino"}
        </h1>
        <p className="mt-1 text-sm text-muted">{longDate(session.date)}</p>
        {session.note && (
          <p
            className="mt-3 rounded-card border-l-2 bg-surface px-3 py-2 text-sm leading-relaxed"
            style={{ borderColor: accent }}
          >
            {session.note}
          </p>
        )}
      </header>

      {day ? (
        <div className="flex flex-col gap-2">
          {day.blocks.map((block) => (
            <div key={block.label}>
              <p className="mb-1 mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                {block.label}
              </p>
              <ul className="flex flex-col gap-2">
                {block.exercises.map((ex) => (
                  <li
                    key={ex.id}
                    className="rounded-card border border-border bg-surface px-4 py-3"
                  >
                    <ExerciseRow
                      exercise={ex}
                      isSkill={block.is_skill}
                      accent={accent}
                      log={logByExercise.get(ex.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          Plano deste treino não está mais disponível nesta versão.
        </p>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise,
  isSkill,
  accent,
  log,
}: {
  exercise: PlanExercise;
  isSkill: boolean;
  accent: string;
  log: ExerciseLog | undefined;
}) {
  const done = !!log && !log.skipped;
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span
          className="min-w-0 truncate font-medium"
          style={isSkill ? { color: accent } : undefined}
        >
          {exercise.name}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="tnum text-sm text-muted">
            {log ? summarize(log, exercise.parsed) : "sem registro"}
          </span>
          {done && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ background: accent, color: "var(--color-on-accent)" }}
              aria-label="concluído"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      </div>
      {log && log.flags_selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {log.flags_selected.map((f) => (
            <span
              key={f}
              className="rounded-full border px-2 py-0.5 text-xs"
              style={{ borderColor: accent, color: accent }}
            >
              {f}
            </span>
          ))}
        </div>
      )}
      {log?.note && (
        <p className="mt-2 text-xs leading-snug text-muted">“{log.note}”</p>
      )}
    </>
  );
}

function summarize(log: ExerciseLog, parsed: PlanExercise["parsed"]): string {
  if (log.skipped) return "pulado";
  if (log.as_target) return "como previsto";
  const s = effectiveSets(log, parsed);
  if (s.length === 0) return "feito";
  const unit = parsed?.unit === "seconds" ? "s" : "";
  return s.map((v) => `${v}${unit}`).join("/");
}
