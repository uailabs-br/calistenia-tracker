"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { skills, skillStepExerciseIds } from "@/lib/plan/skills";
import { getFirstCleanSuccess } from "@/lib/db/queries/skillProgress";
import { skillPosition } from "@/lib/domain/skillMap";
import { getSkillLevels } from "@/lib/utils/skillLevel";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronRightIcon } from "@/components/ui/icons";

const CAT_ACCENT: Record<string, string> = {
  Puxar: "#a89cff",
  Empurrar: "#7fd1ae",
  Core: "#f2b366",
  Pernas: "#e88fb0",
};

/** Índice das skills de calistenia: escada de cada uma + onde você está. */
export default function SkillsIndexPage() {
  const firstSuccess = useLiveQuery(
    () => getFirstCleanSuccess(skillStepExerciseIds()),
    []
  );
  const achieved = new Set(firstSuccess?.keys() ?? []);

  const [manual, setManual] = useState<Record<string, number>>({});
  useEffect(() => setManual(getSkillLevels()), []);

  return (
    <div className="px-4">
      <PageHeader title="Skills" subtitle="progressões de calistenia" />

      <ul className="flex flex-col gap-2">
        {skills.map((skill) => {
          const total = skill.steps.length;
          const logPosition = skillPosition(skill.steps, achieved);
          const override = manual[skill.id];
          const position =
            override !== undefined ? Math.max(logPosition, override) : logPosition;
          const done = position >= total;
          const accent = CAT_ACCENT[skill.category] ?? "var(--ac)";
          const focus = done ? null : skill.steps[position];
          return (
            <li key={skill.id}>
              <Link
                href={`/skills/${skill.id}`}
                className="tap flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold"
                  style={{ background: `${accent}22`, color: accent }}
                >
                  {position}/{total}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{skill.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {done ? "escada concluída 🎉" : `agora: ${focus?.label}`}
                  </span>
                </span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="h-8" />
    </div>
  );
}
