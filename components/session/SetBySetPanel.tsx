"use client";

import { useState } from "react";
import { CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { useHoldRepeat } from "@/lib/utils/useHoldRepeat";

/**
 * Registro série a série: quadradinhos das séries + stepper grande. Registrar
 * uma série já abre o descanso (quem decide é o pai), então custa o mesmo toque
 * de quem usava o cronômetro entre as séries, e o registro fica feito na hora.
 * Só estado de tela aqui (série selecionada); séries feitas vêm de fora.
 */
export function SetBySetPanel({
  accent,
  unit,
  targets,
  done,
  logged,
  canAddSet,
  onTargetChange,
  onLogSet,
  onFinish,
  onEditDone,
  onAddSet,
}: {
  accent: string;
  unit: "reps" | "seconds";
  /** Valor sugerido de cada série (o tamanho é o nº de séries). */
  targets: number[];
  /** Séries já feitas: a parcial, ou as do log quando o exercício já fechou. */
  done: number[];
  /** Exercício já registrado: só dá pra corrigir séries. */
  logged: boolean;
  /** Exercício acrescentado no treino: sem plano, a pessoa decide quantas séries. */
  canAddSet: boolean;
  onTargetChange: (index: number, value: number) => void;
  onLogSet: (next: number[]) => void;
  /** `asPlanned`: "registrar todas como previsto" sem nenhuma série feita, igual ao antigo "Fiz como previsto". */
  onFinish: (all: number[], asPlanned?: boolean) => void;
  onEditDone: (next: number[]) => void;
  onAddSet: () => void;
}) {
  const [sel, setSel] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(0);
  const [popped, setPopped] = useState<number | null>(null);

  const total = Math.max(targets.length, done.length);
  const cur = logged ? -1 : done.length < total ? done.length : -1;
  const suffix = unit === "seconds" ? "s" : "";
  const unitLabel = unit === "seconds" ? "segundos" : "reps";

  const editing = sel !== null;
  const stepperIndex = editing ? sel : cur;
  const stepperValue = editing ? editValue : (targets[cur] ?? targets[targets.length - 1] ?? 0);
  const setStepper = (v: number) => {
    const next = Math.max(0, v);
    if (editing) setEditValue(next);
    else if (cur !== -1) onTargetChange(cur, next);
  };
  const hold = useHoldRepeat((dir) => setStepper(stepperValue + dir));

  const pick = (i: number) => {
    if (i < done.length) {
      if (sel === i) return setSel(null);
      setSel(i);
      setEditValue(done[i]);
    } else if (i === cur) setSel(null);
  };

  const logCurrent = () => {
    const next = [...done, stepperValue];
    setPopped(cur);
    if (next.length >= total) onFinish(next);
    else onLogSet(next);
  };

  const saveEdit = () => {
    if (sel === null) return;
    const next = done.map((v, i) => (i === sel ? editValue : v));
    setPopped(sel);
    setSel(null);
    onEditDone(next);
  };

  const removeSel = () => {
    if (sel === null) return;
    const next = done.filter((_, i) => i !== sel);
    setSel(null);
    onEditDone(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="list" aria-label="Séries">
        {Array.from({ length: total }, (_, i) => {
          const isDone = i < done.length;
          const isCur = i === cur;
          const value = isDone ? done[i] : targets[i];
          return (
            <button
              key={i}
              type="button"
              role="listitem"
              onClick={() => pick(i)}
              aria-label={`Série ${i + 1}: ${value}${suffix}${isDone ? ", feita" : ""}`}
              className={`tnum flex h-11 min-w-11 items-center justify-center rounded-[10px] px-2 font-mono text-sm ${
                isDone ? "font-medium" : isCur ? "border text-text" : "border border-dashed border-border text-muted"
              } ${popped === i ? "anim-pop" : ""}`}
              style={{
                ...(isDone ? { background: accent, color: "var(--color-on-accent)" } : {}),
                ...(isCur ? { borderColor: `color-mix(in oklab, ${accent} 60%, transparent)` } : {}),
                ...(sel === i ? { outline: "2px solid var(--color-text)", outlineOffset: 2 } : {}),
              }}
              onAnimationEnd={() => setPopped(null)}
            >
              {value}
              {suffix}
            </button>
          );
        })}
        {canAddSet && !logged && (
          <button
            type="button"
            onClick={onAddSet}
            aria-label="Somar uma série"
            className="tap flex h-11 min-w-11 items-center justify-center rounded-[10px] border border-dashed border-border text-muted"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {stepperIndex !== -1 && (
        <div className="grid grid-cols-[4rem_1fr_4rem] items-center gap-2">
          <button
            type="button"
            aria-label="Menos um"
            {...hold(-1)}
            className="btn-key flex h-16 items-center justify-center rounded-2xl text-text"
          >
            <MinusIcon className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center" aria-live="polite">
            <span className="display h-[4.5rem] overflow-hidden text-[4.5rem] leading-none">
              <RollingNumber value={stepperValue} />
            </span>
            <span className="mt-1 font-mono text-[11px] text-muted">
              {unitLabel} · série {stepperIndex + 1}
            </span>
          </div>
          <button
            type="button"
            aria-label="Mais um"
            {...hold(1)}
            className="btn-key flex h-16 items-center justify-center rounded-2xl text-text"
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={saveEdit}
            className="btn-primary tap flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium"
            style={{ "--ac": accent } as React.CSSProperties}
          >
            <CheckIcon className="h-5 w-5" />
            Salvar série {sel + 1}
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={() => setSel(null)} className="tap px-2 font-mono text-xs text-muted">
              cancelar
            </button>
            {!logged && (
              <button type="button" onClick={removeSel} className="tap px-2 font-mono text-xs text-muted">
                apagar série
              </button>
            )}
          </div>
        </div>
      ) : cur !== -1 ? (
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={logCurrent}
            className="btn-primary tap flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium"
            style={{ "--ac": accent } as React.CSSProperties}
          >
            <CheckIcon className="h-5 w-5" />
            Registrar série {cur + 1}
          </button>
          <div className="flex flex-wrap justify-center gap-x-4">
            <button
              type="button"
              onClick={() => onFinish([...done, ...targets.slice(done.length)], done.length === 0)}
              className="tap px-2 font-mono text-xs text-muted underline underline-offset-4"
            >
              {done.length > 0 ? "registrar as que faltam como previsto" : "registrar todas como previsto"}
            </button>
            {done.length > 0 && (
              <button
                type="button"
                onClick={() => onFinish(done)}
                className="tap px-2 font-mono text-xs text-muted underline underline-offset-4"
              >
                terminar com {done.length} {done.length === 1 ? "série" : "séries"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center font-mono text-xs text-muted">toque numa série pra corrigir</p>
      )}
    </div>
  );
}
