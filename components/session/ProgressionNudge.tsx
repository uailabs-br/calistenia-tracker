"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import { getExerciseById } from "@/lib/plan/loader";
import { ArrowUpIcon } from "@/components/ui/icons";
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

/** Uma linha por sinal: o status curto fica à vista, o motivo abre no toque. */
const STATUS: Record<Signal["state"], string> = {
  ready: "subir de nível",
  "generic-ready": "subir de nível",
  regress: "um passo atrás",
};
const DETAIL: Record<Signal["state"], string> = {
  ready: "Critério do nível batido.",
  "generic-ready": "Bateu o alvo nas últimas sessões.",
  regress: "Abaixo do alvo várias sessões seguidas. Considere voltar um passo.",
};

/**
 * "Sinal de progressão": aparece na tela de fim de treino, depois dos números,
 * unificando os dois motores num único aviso — o estruturado v3 (reps×RIR, hold
 * limpo, consistência) pros exercícios mapeados a um nível de skill (ver
 * lib/plan/skills.ts), e o genérico v1 ("bateu o alvo" simples) de fallback
 * pro resto do plano. Informacional — não edita o plano. "Dispensar" reinicia a
 * contagem: o aviso só volta se o critério for batido de novo.
 */
export function ProgressionNudge({
  workout,
  accent,
  excludeSkills = [],
  style,
}: {
  workout: Workout;
  accent: string;
  /** Skills que o bloco de objetivos já mostra no fim do treino: o aviso não repete. */
  excludeSkills?: string[];
  /** Entrada animada, controlada pela tela que mostra o aviso. */
  style?: React.CSSProperties;
}) {
  // dispensar mexe no localStorage (fora do Dexie): força a reavaliação
  const [ackVersion, setAckVersion] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  const signals = useLiveQuery(async (): Promise<Signal[]> => {
    const ids = [...new Set(workout.blocks.flatMap((b) => b.exercises.map((e) => e.id)))];
    const nameOf = (id: string) => getExerciseById(id)?.name ?? id;
    const seen = new Set<string>();
    const out: Signal[] = [];

    for (const id of ids) {
      const mapping = exerciseSkillMapping(id);
      if (mapping && excludeSkills.includes(mapping.skill_id)) continue;
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
  }, [workout, ackVersion, excludeSkills.join("|")]);

  if (!signals || signals.length === 0) return null;

  return (
    <section aria-label="Sinais de progressão" style={style}>
      <p className="eyebrow mb-2">Progressão</p>
      <ul className="card">
        {signals.map((s, i) => {
          const up = s.state !== "regress";
          const color = up ? accent : "var(--color-warn)";
          const isOpen = open === s.key;
          return (
            <li key={s.key} className={i > 0 ? "border-t border-border" : undefined}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.key)}
                aria-expanded={isOpen}
                className="tap flex w-full items-center gap-2.5 px-3.5 text-left"
              >
                <span className="shrink-0" style={{ color }}>
                  <ArrowUpIcon className={`h-[18px] w-[18px] ${up ? "" : "rotate-180"}`} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="shrink-0 font-mono text-xs" style={{ color }}>
                  {STATUS[s.state]}
                </span>
              </button>
              {isOpen && (
                <div className="anim-fade-in flex items-end justify-between gap-3 pb-3 pl-[42px] pr-3.5">
                  <p className="text-[13px] leading-snug text-muted">
                    {DETAIL[s.state]}
                    {s.ladder && <> Critério do nível: {s.ladder}.</>}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      ackProgression(s.key);
                      setOpen(null);
                      setAckVersion((v) => v + 1);
                    }}
                    className="tap shrink-0 px-1 font-mono text-2xs text-muted"
                  >
                    dispensar
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
