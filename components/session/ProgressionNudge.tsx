"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import { getExerciseById } from "@/lib/plan/loader";
import { getProgressionReady } from "@/lib/db/queries/progressionReady";
import { exerciseSkillMapping, getLevelInfo } from "@/lib/plan/skills";
import { getSkillState } from "@/lib/db/queries/skillProgression";
import {
  ackKeyExercise,
  ackKeySkill,
  ackProgression,
  ackedAt,
} from "@/lib/utils/progressionAck";

interface Signal {
  /** chave de dispensa (skill+nível ou exercício) */
  key: string;
  /** nome do exercício do PLANO — é o que o usuário reconhece */
  name: string;
  /** degrau da escada canônica que o critério avalia (só motor estruturado) */
  ladder: string | null;
  state: "ready" | "regress" | "generic-ready";
}

const TEXT: Record<Signal["state"], string> = {
  ready: "critério batido, pronto pra subir 💪",
  "generic-ready": "bateu o alvo nas últimas sessões, pronto pra subir 💪",
  regress: "abaixo do alvo várias sessões seguidas, considere um passo atrás",
};

/**
 * "Sinal de progressão": aparece no fim da sessão (não interrompe), unificando
 * os dois motores num único aviso — o estruturado v3 (reps×RIR, hold limpo,
 * consistência) pros exercícios mapeados a um nível de skill (ver
 * lib/plan/skills.ts), e o genérico v1 ("bateu o alvo" simples) de fallback
 * pro resto do plano. Informacional — não edita o plano. "Dispensar" reinicia a
 * contagem: o aviso só volta se o critério for batido de novo.
 */
export function ProgressionNudge({ day, accent }: { day: PlanDay; accent: string }) {
  // dispensar mexe no localStorage (fora do Dexie): força a reavaliação
  const [ackVersion, setAckVersion] = useState(0);

  const signals = useLiveQuery(async (): Promise<Signal[]> => {
    const ids = [...new Set(day.blocks.flatMap((b) => b.exercises.map((e) => e.id)))];
    const nameOf = (id: string) => getExerciseById(id)?.name ?? id;
    const seen = new Set<string>();
    const out: Signal[] = [];

    for (const id of ids) {
      const mapping = exerciseSkillMapping(id);
      if (mapping) {
        const key = ackKeySkill(mapping.skill_id, mapping.level);
        if (seen.has(key)) continue; // dois exercícios no mesmo nível: um aviso só
        seen.add(key);
        const state = await getSkillState(
          mapping.skill_id,
          mapping.level,
          undefined,
          ackedAt(key)
        );
        if (state !== "ready" && state !== "regress") continue;
        out.push({
          key,
          name: nameOf(id),
          ladder: getLevelInfo(mapping.skill_id, mapping.level)?.name ?? null,
          state,
        });
      } else {
        const key = ackKeyExercise(id);
        if (!(await getProgressionReady(id, ackedAt(key)))) continue;
        out.push({ key, name: nameOf(id), ladder: null, state: "generic-ready" });
      }
    }
    return out;
  }, [day, ackVersion]);

  if (!signals || signals.length === 0) return null;

  return (
    <section
      className="anim-fade-in-up mt-6 rounded-card border px-4 py-4"
      style={{ borderColor: accent }}
    >
      <p className="text-sm font-semibold" style={{ color: accent }}>
        Sinal de progressão
      </p>
      <ul className="mt-2 flex flex-col gap-3 text-sm">
        {signals.map((s) => (
          <li key={s.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted"> · {TEXT[s.state]}</span>
              {s.ladder && (
                <p className="mt-0.5 text-xs text-muted">critério do nível: {s.ladder}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                ackProgression(s.key);
                setAckVersion((v) => v + 1);
              }}
              className="tap -mr-1 shrink-0 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
            >
              dispensar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
