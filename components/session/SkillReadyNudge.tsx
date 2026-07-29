"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import { exerciseSkillMapping, getLevelInfo } from "@/lib/plan/skills";
import { getSkillState, type SkillState } from "@/lib/db/queries/skillProgression";

interface SkillNudgeItem {
  exerciseId: string;
  skillId: string;
  level: number;
  state: SkillState;
}

/**
 * Sinal do motor de progressão v2, só pros exercícios do dia mapeados a um
 * nível de skill (ver lib/plan/skills.ts). Complementa (não substitui) o
 * ProgressionNudge genérico — que segue sendo o fallback pros exercícios
 * sem mapeamento.
 */
export function SkillReadyNudge({ day, accent }: { day: PlanDay; accent: string }) {
  const items = useLiveQuery(async (): Promise<SkillNudgeItem[]> => {
    const ids = [
      ...new Set(day.blocks.flatMap((b) => b.exercises.map((e) => e.id))),
    ];
    const mapped = ids
      .map((id) => ({ id, mapping: exerciseSkillMapping(id) }))
      .filter(
        (x): x is { id: string; mapping: NonNullable<ReturnType<typeof exerciseSkillMapping>> } =>
          x.mapping !== null
      );
    const checks = await Promise.all(
      mapped.map(async ({ id, mapping }) => ({
        exerciseId: id,
        skillId: mapping.skill_id,
        level: mapping.level,
        state: await getSkillState(mapping.skill_id, mapping.level),
      }))
    );
    return checks.filter((c) => c.state === "ready" || c.state === "regress");
  }, [day]);

  if (!items || items.length === 0) return null;

  return (
    <section
      className="anim-fade-in-up mt-6 rounded-card border px-4 py-4"
      style={{ borderColor: accent }}
    >
      <p className="text-sm font-semibold" style={{ color: accent }}>
        Sinal de progressão
      </p>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {items.map((item) => {
          const info = getLevelInfo(item.skillId, item.level);
          return (
            <li key={item.exerciseId}>
              <span className="font-medium">{info?.name ?? item.exerciseId}</span>
              <span className="text-muted">
                {" "}
                — {item.state === "ready" ? "pronto pra subir de nível 💪" : "considere um passo atrás"}
              </span>
              {info?.description && (
                <span className="mt-0.5 block text-xs text-muted">
                  {info.description}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
