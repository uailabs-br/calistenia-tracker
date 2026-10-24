"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getSkillById, getCriteria, formatCriteria } from "@/lib/plan/skills";
import { getFirstCleanSuccess } from "@/lib/db/queries/skillProgress";
import {
  displayedPosition,
  skillPosition,
  stepStatus,
  type StepStatus,
} from "@/lib/domain/skillMap";
import {
  getSkillLevels,
  setSkillLevel,
  clearSkillLevel,
} from "@/lib/utils/skillLevel";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckIcon } from "@/components/ui/icons";
import { accentVars, CATEGORY_ACCENT } from "@/components/ui/accent";
import { shortDate } from "@/lib/utils/date";

/** Bolinha do nível: preenchida (feito), contornada (foco) ou apagada. */
const STEP_DOT: Record<StepStatus, string> = {
  done: "bg-ac text-on-accent",
  focus: "border-2 border-ac text-ac",
  locked: "border border-border text-muted",
};

export default function SkillMapPage() {
  const params = useParams<{ skill: string }>();
  const skill = getSkillById(params.skill);

  const stepIds = useMemo(
    () =>
      (skill?.steps ?? [])
        .map((s) => s.exercise_id)
        .filter((id): id is string => Boolean(id)),
    [skill]
  );

  const firstSuccess = useLiveQuery(
    () => getFirstCleanSuccess(stepIds),
    [stepIds.join(",")]
  );

  const [manual, setManual] = useState<number | null>(null);
  useEffect(() => {
    setManual(getSkillLevels()[params.skill] ?? null);
  }, [params.skill]);

  if (!skill) {
    return (
      <div className="px-4">
        <BackLink href="/skills" label="Skills" />
        <PageHeader title="Skill não encontrada" />
      </div>
    );
  }

  const accent = CATEGORY_ACCENT[skill.category];
  const achieved = new Set(firstSuccess?.keys() ?? []);
  const position = displayedPosition(skillPosition(skill.steps, achieved), manual);

  const mark = (i: number) => {
    setSkillLevel(skill.id, i);
    setManual(i);
  };
  const clearManual = () => {
    clearSkillLevel(skill.id);
    setManual(null);
  };

  return (
    <div style={accentVars(accent)} className="px-4">
      <BackLink href="/skills" label="Skills" />
      <PageHeader title={skill.name} subtitle={skill.category} />

      {manual !== null ? (
        <button
          type="button"
          onClick={clearManual}
          className="tap -mt-2 mb-3 inline-flex items-center gap-2 text-xs text-muted active:opacity-70"
        >
          nível ajustado por você
          <span className="rounded-full border border-border px-2 py-0.5 uppercase">
            limpar
          </span>
        </button>
      ) : (
        <p className="-mt-2 mb-3 text-xs text-muted">
          Toque no número do nível para marcar onde você está.
        </p>
      )}

      <ol className="flex flex-col">
        {skill.steps.map((step, i) => {
          const status = stepStatus(i, position);
          const date = step.exercise_id ? firstSuccess?.get(step.exercise_id) : undefined;
          const last = i === skill.steps.length - 1;
          const criteria = getCriteria(skill.id, step.level);
          return (
            <li key={`${step.label}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => mark(i)}
                  aria-label={`Marcar "${step.label}" como meu nível atual`}
                  className={`tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold active:scale-90 ${STEP_DOT[status]}`}
                >
                  {status === "done" ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </button>
                {!last && (
                  <span
                    className={`min-h-7 w-px flex-1 ${status === "done" ? "bg-ac" : "bg-border"}`}
                  />
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${status === "locked" ? "text-muted" : ""}`}>
                    {step.label}
                  </span>
                  {status === "focus" && (
                    <span
                      className="rounded-full bg-ac/14 px-2 py-0.5 font-mono text-3xs uppercase text-ac"
                    >
                      você está aqui
                    </span>
                  )}
                </div>
                {date && (
                  <p className="mt-0.5 text-xs text-muted">1º limpo em {shortDate(date)}</p>
                )}
                {step.criteria && (
                  <p className="mt-1 text-xs leading-snug text-muted">{step.criteria}</p>
                )}
                {criteria && (
                  <p
                    className={`mt-1 font-mono text-2xs ${status === "locked" ? "text-muted" : "text-ac"}`}
                  >
                    {formatCriteria(criteria)}
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
