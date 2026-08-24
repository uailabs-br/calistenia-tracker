"use client";

import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import { getExerciseById } from "@/lib/plan/loader";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";
import { exerciseSkillMapping, getLevelInfo } from "@/lib/plan/skills";
import { getSkillState } from "@/lib/db/queries/skillProgression";

interface Signal {
  id: string;
  name: string;
  state: "ready" | "regress" | "generic-ready";
}

/**
 * "Sinal de progressão": aparece no fim da sessão (não interrompe), unificando
 * os dois motores num único aviso — o estruturado v3 (reps×RIR, hold limpo,
 * consistência) pros exercícios mapeados a um nível de skill (ver
 * lib/plan/skills.ts), e o genérico v1 ("bateu o alvo" simples) de fallback
 * pro resto do plano. Informacional — não edita o plano.
 */
export function ProgressionNudge({ day, accent }: { day: PlanDay; accent: string }) {
  const signals = useLiveQuery(async (): Promise<Signal[]> => {
    const ids = [...new Set(day.blocks.flatMap((b) => b.exercises.map((e) => e.id)))];

    const mapped = ids
      .map((id) => ({ id, mapping: exerciseSkillMapping(id) }))
      .filter(
        (x): x is { id: string; mapping: NonNullable<ReturnType<typeof exerciseSkillMapping>> } =>
          x.mapping !== null
      );
    const structured = await Promise.all(
      mapped.map(async ({ id, mapping }): Promise<Signal | null> => {
        const state = await getSkillState(mapping.skill_id, mapping.level);
        if (state !== "ready" && state !== "regress") return null;
        const info = getLevelInfo(mapping.skill_id, mapping.level);
        return { id, name: info?.name ?? id, state };
      })
    );

    const genericIds = ids.filter((id) => !exerciseSkillMapping(id));
    const generic = await Promise.all(
      genericIds.map(async (id): Promise<Signal | null> => {
        const ready = await getProgressionReady(id);
        if (!ready) return null;
        return { id, name: getExerciseById(id)?.name ?? id, state: "generic-ready" };
      })
    );

    return [...structured, ...generic].filter((s): s is Signal => s !== null);
  }, [day]);

  if (!signals || signals.length === 0) return null;

  return (
    <section
      className="anim-fade-in-up mt-6 rounded-card border px-4 py-4"
      style={{ borderColor: accent }}
    >
      <p className="text-sm font-semibold" style={{ color: accent }}>
        Sinal de progressão
      </p>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {signals.map((s) => (
          <li key={s.id}>
            <span className="font-medium">{s.name}</span>
            <span className="text-muted">
              {" "}
              —{" "}
              {s.state === "regress"
                ? "considere um passo atrás"
                : "pronto pra subir de nível 💪"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
