"use client";

import { use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { ExerciseLog } from "@/lib/db/schema";
import { getSessionDetail } from "@/lib/db/queries/sessions";
import { getWorkoutById } from "@/lib/plan/loader";
import { getCatalogExercise } from "@/lib/plan/catalog";
import { resolveLogExercise } from "@/lib/plan/resolve";
import type { PlanExercise } from "@/lib/plan/schema";
import { summarizeLog } from "@/lib/domain/volume";
import { longDate, formatDuration } from "@/lib/utils/date";
import { BackLink } from "@/components/ui/BackLink";
import { CheckIcon } from "@/components/ui/icons";
import { DEFAULT_ACCENT } from "@/components/ui/accent";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const data = useLiveQuery(() => getSessionDetail(id), [id]);

  const backLink = <BackLink href="/historico" label="Histórico" />;

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
  const isFreeform = session.source === "freeform";
  const day = isFreeform ? undefined : (session.workout_id ? getWorkoutById(session.workout_id) : undefined);
  const accent = day?.accent ?? DEFAULT_ACCENT;
  const duration =
    session.started_at && session.ended_at
      ? formatDuration(session.started_at, session.ended_at)
      : null;

  const logByExercise = new Map<string, ExerciseLog>();
  logs.forEach((l) => logByExercise.set(l.exercise_id, l));

  // Registros que não estão no treino do dia do plano vigente: os acrescentados
  // no meio do treino e os de um plano anterior. Nome e alvo vêm do snapshot.
  const planIds = new Set(
    day ? day.blocks.flatMap((b) => b.exercises.map((e) => e.id)) : []
  );
  const addedIds = new Set(session.added_exercises ?? []);
  const outsideRows = logs
    .filter((l) => !planIds.has(l.exercise_id))
    .sort((a, b) => a.logged_at - b.logged_at)
    .map((log) => {
      const r = resolveLogExercise(log, session.workout_id);
      const exercise: PlanExercise = {
        id: log.exercise_id,
        name: r.name ?? getCatalogExercise(log.exercise_id)?.name ?? log.exercise_id,
        target: r.target,
        parsed: r.parsed,
        obs: "",
        rest: "",
        flags: [],
      };
      return { log, exercise, added: addedIds.has(log.exercise_id) };
    });
  const addedRows = outsideRows.filter((r) => r.added);
  const otherRows = outsideRows.filter((r) => !r.added);

  return (
    <div className="px-4 pb-8">
      {backLink}

      <header className="pt-1 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 font-mono text-xs"
            style={{ background: day?.accent_bg, color: accent }}
          >
            {isFreeform ? "Avulso" : (day?.label ?? "Treino")}
          </span>
          {duration && (
            <span className="font-mono text-xs text-muted">{duration}</span>
          )}
          {!isFreeform && (
            <span className="tnum font-mono text-xs" style={{ color: accent }}>
              RPE {session.rpe ?? "-"}
            </span>
          )}
        </div>
        <h1 className="display mt-2 text-3xl leading-tight">
          {isFreeform ? "Treino avulso" : (day?.title ?? "Treino")}
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

      {isFreeform ? (
        <p className="text-sm text-muted">
          Treino fora do programa — sem exercícios do plano registrados.
        </p>
      ) : (
        <>
          {day ? (
            <div className="flex flex-col gap-2">
              {day.blocks.map((block) => (
                <div key={block.label}>
                  <p className="eyebrow mb-1 mt-3">
                    {block.label}
                  </p>
                  <ul className="flex flex-col gap-2">
                    {block.exercises.map((ex) => (
                      <li
                        key={ex.id}
                        className="card px-4 py-3"
                      >
                        <ExerciseRow
                          exercise={withSnapshotTarget(ex, logByExercise.get(ex.id))}
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
            outsideRows.length === 0 && (
              <p className="text-sm text-muted">
                Plano deste treino não está mais disponível nesta versão.
              </p>
            )
          )}

          <OutsideSection title="Adicionados ao treino" rows={addedRows} accent={accent} />
          <OutsideSection
            title={day ? "Fora do plano atual" : "Exercícios registrados"}
            rows={otherRows}
            accent={accent}
          />
        </>
      )}
    </div>
  );
}

/** O alvo do dia em que foi feito (snapshot) vale mais que o do plano de hoje. */
function withSnapshotTarget(ex: PlanExercise, log: ExerciseLog | undefined): PlanExercise {
  return log?.snapshot
    ? { ...ex, target: log.snapshot.target, parsed: log.snapshot.parsed }
    : ex;
}

/** Registros fora do treino do dia (acrescentados ou de um plano anterior). */
function OutsideSection({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: { log: ExerciseLog; exercise: PlanExercise }[];
  accent: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="eyebrow mb-1 mt-4">
        {title}
      </p>
      <ul className="flex flex-col gap-2">
        {rows.map(({ log, exercise }) => (
          <li
            key={log.id}
            className="card px-4 py-3"
          >
            <ExerciseRow exercise={exercise} isSkill={false} accent={accent} log={log} />
          </li>
        ))}
      </ul>
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
            {log ? summarizeLog(log, exercise.parsed, exercise.target) : "sem registro"}
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
