"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { skills, skillStepExerciseIds } from "@/lib/plan/skills";
import { getFirstCleanSuccess } from "@/lib/db/queries/skillProgress";
import { displayedPosition, skillPosition } from "@/lib/domain/skillMap";
import { getSkillLevels } from "@/lib/utils/skillLevel";
import { BackLink } from "@/components/ui/BackLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronRightIcon } from "@/components/ui/icons";
import { CATEGORY_ACCENT } from "@/components/ui/accent";

/** Mapa de progressões (em Treino): a sequência de cada skill e onde você está. */
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
      <BackLink href="/plano" label="Treino" />
      <PageHeader title="Skills" />
      <p className="-mt-2 mb-5 text-sm text-muted">
        Onde você está em cada skill. Toque numa pra ver a sequência de progressões.
      </p>

      <ul className="flex flex-col gap-2">
        {skills.map((skill) => {
          const total = skill.steps.length;
          const position = displayedPosition(
            skillPosition(skill.steps, achieved),
            manual[skill.id]
          );
          const done = position >= total;
          const accent = CATEGORY_ACCENT[skill.category];
          const focus = done ? null : skill.steps[position];
          return (
            <li key={skill.id}>
              <Link
                href={`/skills/${skill.id}`}
                className="card tap flex items-center gap-3 px-4 py-3 active:scale-[0.99]"
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
                    {done ? "sequência concluída 🎉" : `agora: ${focus?.label}`}
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
