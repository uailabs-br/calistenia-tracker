"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getDayByWeekday, getExerciseById } from "@/lib/plan/loader";
import { getFirstCleanSuccess } from "@/lib/db/queries/skillProgress";
import { chainPosition, stepStatus } from "@/lib/domain/skillMap";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckIcon } from "@/components/ui/icons";
import { shortDate } from "@/lib/utils/date";

export default function SkillMapPage() {
  const params = useParams<{ weekday: string }>();
  const day = getDayByWeekday(Number(params.weekday));

  const stepIds = useMemo(
    () =>
      (day?.progression ?? [])
        .map((p) => p.exercise_id)
        .filter((id): id is string => id !== null),
    [day]
  );

  const firstSuccess = useLiveQuery(
    () => getFirstCleanSuccess(stepIds),
    [stepIds.join(",")]
  );

  if (!day) {
    return (
      <div className="px-4">
        <PageHeader title="Skill não encontrada" />
      </div>
    );
  }

  if (day.progression.length === 0) {
    return (
      <div className="px-4">
        <PageHeader title={day.skill} subtitle="mapa da skill" />
        <p className="text-muted">Esse dia não tem uma cadeia de progressão.</p>
      </div>
    );
  }

  const achieved = new Set(firstSuccess?.keys() ?? []);
  const position = chainPosition(day.progression, achieved);

  return (
    <div style={{ ["--ac" as string]: day.accent }} className="px-4">
      <PageHeader title={day.skill} subtitle="mapa da skill" />

      <ol className="flex flex-col">
        {day.progression.map((step, i) => {
          const status = stepStatus(i, position);
          const name = step.exercise_id
            ? getExerciseById(step.exercise_id)?.name ?? step.exercise_id
            : step.label ?? "Objetivo final";
          const date = step.exercise_id
            ? firstSuccess?.get(step.exercise_id)
            : undefined;
          const last = i === day.progression.length - 1;
          return (
            <li key={step.exercise_id ?? `goal-${i}`} className="flex gap-3">
              {/* trilho + marcador */}
              <div className="flex flex-col items-center">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={
                    status === "done"
                      ? { background: "var(--ac)", color: "var(--color-on-accent)" }
                      : status === "focus"
                        ? { border: "2px solid var(--ac)", color: "var(--ac)" }
                        : { border: "1px solid var(--color-border)", color: "var(--color-muted)" }
                  }
                >
                  {status === "done" ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </span>
                {!last && (
                  <span
                    className="w-px flex-1"
                    style={{
                      minHeight: 28,
                      background:
                        status === "done" ? "var(--ac)" : "var(--color-border)",
                    }}
                  />
                )}
              </div>

              {/* conteúdo */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2">
                  <span
                    className="font-medium"
                    style={status === "locked" ? { color: "var(--color-muted)" } : undefined}
                  >
                    {name}
                  </span>
                  {status === "focus" && (
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase"
                      style={{ background: day.accent_bg, color: day.accent }}
                    >
                      você está aqui
                    </span>
                  )}
                </div>
                {date && (
                  <p className="mt-0.5 text-xs text-muted">
                    1º limpo em {shortDate(date)}
                  </p>
                )}
                {step.criteria && (
                  <p className="mt-1 text-xs leading-snug text-muted">
                    {step.criteria}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="h-8" />
    </div>
  );
}
