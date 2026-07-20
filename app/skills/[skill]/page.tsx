"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { getSkillById } from "@/lib/plan/skills";
import { getFirstCleanSuccess } from "@/lib/db/queries/skillProgress";
import { skillPosition, stepStatus } from "@/lib/domain/skillMap";
import {
  getSkillLevels,
  setSkillLevel,
  clearSkillLevel,
} from "@/lib/utils/skillLevel";
import { PageHeader } from "@/components/ui/PageHeader";
import { CheckIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { shortDate } from "@/lib/utils/date";

const BackLink = () => (
  <Link
    href="/skills"
    className="tap -ml-2 mb-2 inline-flex items-center gap-1 pt-6 text-sm text-muted"
  >
    <ChevronLeftIcon className="h-4 w-4" />
    Skills
  </Link>
);

const CAT_ACCENT: Record<string, string> = {
  Puxar: "#a89cff",
  Empurrar: "#7fd1ae",
  Core: "#f2b366",
  Pernas: "#e88fb0",
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
        <BackLink />
        <PageHeader title="Skill não encontrada" />
      </div>
    );
  }

  const accent = CAT_ACCENT[skill.category] ?? "var(--ac)";
  const achieved = new Set(firstSuccess?.keys() ?? []);
  const logPosition = skillPosition(skill.steps, achieved);
  const position = manual !== null ? Math.max(logPosition, manual) : logPosition;

  const mark = (i: number) => {
    setSkillLevel(skill.id, i);
    setManual(i);
  };
  const clearManual = () => {
    clearSkillLevel(skill.id);
    setManual(null);
  };

  return (
    <div style={{ ["--ac" as string]: accent }} className="px-4">
      <BackLink />
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
          return (
            <li key={`${step.label}-${i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => mark(i)}
                  aria-label={`Marcar "${step.label}" como meu nível atual`}
                  className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold active:scale-90"
                  style={
                    status === "done"
                      ? { background: "var(--ac)", color: "var(--color-on-accent)" }
                      : status === "focus"
                        ? { border: "2px solid var(--ac)", color: "var(--ac)" }
                        : { border: "1px solid var(--color-border)", color: "var(--color-muted)" }
                  }
                >
                  {status === "done" ? <CheckIcon className="h-4 w-4" /> : i + 1}
                </button>
                {!last && (
                  <span
                    className="w-px flex-1"
                    style={{
                      minHeight: 28,
                      background: status === "done" ? "var(--ac)" : "var(--color-border)",
                    }}
                  />
                )}
              </div>

              <div className="flex-1 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-medium"
                    style={status === "locked" ? { color: "var(--color-muted)" } : undefined}
                  >
                    {step.label}
                  </span>
                  {status === "focus" && (
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase"
                      style={{ background: `${accent}22`, color: accent }}
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
              </div>
            </li>
          );
        })}
      </ol>

      <div className="h-8" />
    </div>
  );
}
