"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import { getExerciseById } from "@/lib/plan/loader";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";

/**
 * "Pronto pra subir de nível": aparece no fim da sessão (não interrompe) para os
 * movimentos que bateram o alvo limpo nas últimas sessões. Informacional — cita
 * o critério do plano quando existir. v1 não edita o plano.
 */
export function ProgressionNudge({ day, accent }: { day: PlanDay; accent: string }) {
  const ready = useLiveQuery(async () => {
    const ids = [
      ...new Set(day.blocks.flatMap((b) => b.exercises.map((e) => e.id))),
    ];
    const checks = await Promise.all(
      ids.map(async (id) => ({ id, ready: await getProgressionReady(id) }))
    );
    return checks.filter((c) => c.ready).map((c) => c.id);
  }, [day]);

  if (!ready || ready.length === 0) return null;

  return (
    <section
      className="anim-fade-in-up mt-6 rounded-card border px-4 py-4"
      style={{ borderColor: accent }}
    >
      <p className="text-sm font-semibold" style={{ color: accent }}>
        Pronto pra subir de nível 💪
      </p>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {ready.map((id) => {
          const name = getExerciseById(id)?.name ?? id;
          const criteria = day.progression.find(
            (p) => p.exercise_id === id
          )?.criteria;
          return (
            <li key={id}>
              <span className="font-medium">{name}</span>
              <span className="text-muted">
                {" "}
                — 2 sessões no alvo, sem falha de técnica.
              </span>
              {criteria && (
                <span className="mt-0.5 block text-xs text-muted">{criteria}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
