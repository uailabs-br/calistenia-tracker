"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanExercise } from "@/lib/plan/schema";
import type { ExerciseLog, SetValue } from "@/lib/db/schema";
import { adjustSets, parseRestSeconds } from "@/lib/domain/parseTarget";
import { effectiveSets } from "@/lib/domain/volume";
import {
  getLastPerformance,
  formatLastPerf,
  type LastPerf,
} from "@/lib/db/queries/lastPerformance";
import { CheckIcon, TimerIcon } from "@/components/ui/icons";
import { Stepper } from "./Stepper";
import { FlagChips } from "./FlagChips";
import { ExerciseNote } from "./ExerciseNote";

export interface RecordInput {
  as_target: boolean;
  sets: SetValue[] | null;
  flags_selected: string[];
  note: string | null;
  skipped: boolean;
}

interface Props {
  exercise: PlanExercise;
  isSkill: boolean;
  accent: string;
  sessionId: string;
  log: ExerciseLog | undefined;
  active: boolean;
  onActivate: () => void;
  /** Ação de registro (avança, dá undo e inicia descanso). */
  onRecord: (input: RecordInput) => void;
  /** Persistência silenciosa (flags/nota) — sem avançar nem tocar o descanso. */
  onPersist: (input: RecordInput) => void;
  /** Inicia um descanso manual (entre séries) com a duração em segundos. */
  onRest?: (seconds: number) => void;
}

export function ExerciseCard({
  exercise,
  isSkill,
  accent,
  sessionId,
  log,
  active,
  onActivate,
  onRecord,
  onPersist,
  onRest,
}: Props) {
  const parsed = exercise.parsed;
  const restSeconds = parseRestSeconds(exercise.rest) ?? 90;

  const [adjusting, setAdjusting] = useState(false);
  const [values, setValues] = useState<number[]>(() => adjustSets(parsed));
  const [flags, setFlags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  // Sincroniza estado local com o log persistido (retomada / edição)
  useEffect(() => {
    if (log) {
      setFlags(log.flags_selected);
      setNote(log.note ?? "");
      const s = effectiveSets(log, parsed);
      if (s.length > 0) setValues(s);
      else setValues(adjustSets(parsed));
      setAdjusting(!log.as_target && !log.skipped && (log.sets?.length ?? 0) > 0);
    } else {
      setValues(adjustSets(parsed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.id]);

  const lastPerf = useLiveQuery(
    () => getLastPerformance(exercise.id, sessionId),
    [exercise.id, sessionId]
  );

  // Auto-scroll: ao virar o card ativo, traz para o centro da viewport.
  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    cardRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
  }, [active]);

  const baseInput = () => ({
    flags_selected: flags,
    note: note.trim() ? note.trim() : null,
  });

  const recordAsTarget = () =>
    onRecord({ as_target: true, sets: null, skipped: false, ...baseInput() });

  const recordAdjusted = () =>
    onRecord({
      as_target: false,
      sets: values.map((value, index) => ({ index, value })),
      skipped: false,
      ...baseInput(),
    });

  const recordSkipped = () =>
    onRecord({ as_target: false, sets: null, skipped: true, ...baseInput() });

  const startAdjust = () => {
    if (!log) setValues(seedAdjustValues(parsed, lastPerf));
    setAdjusting(true);
  };

  const toggleFlag = (flag: string) => {
    const next = flags.includes(flag)
      ? flags.filter((f) => f !== flag)
      : [...flags, flag];
    setFlags(next);
    // se já registrado, persiste imediatamente preservando o tipo de registro
    if (log && !log.skipped) {
      onPersist({
        as_target: log.as_target,
        sets: log.sets,
        flags_selected: next,
        note: note.trim() ? note.trim() : null,
        skipped: false,
      });
    }
  };

  const commitNote = (value: string) => {
    setNote(value);
    if (log && !log.skipped) {
      onPersist({
        as_target: log.as_target,
        sets: log.sets,
        flags_selected: flags,
        note: value.trim() ? value.trim() : null,
        skipped: false,
      });
    }
  };

  const done = !!log && !log.skipped;
  const skipped = !!log?.skipped;

  // ── Card colapsado ─────────────────────────────────────────────────
  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="w-full rounded-card border border-border bg-surface px-4 py-3 text-left transition-colors duration-200"
        style={done ? { borderColor: accent } : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p
              className="truncate font-medium"
              style={isSkill ? { color: accent } : undefined}
            >
              {exercise.name}
            </p>
            <p className="tnum text-xs text-muted">
              {skipped ? "pulado" : summarize(log, parsed) ?? exercise.target}
            </p>
          </div>
          {done ? (
            <span
              className="anim-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: accent, color: "var(--color-on-accent)" }}
              aria-label="concluído"
            >
              <CheckIcon className="h-4 w-4" />
            </span>
          ) : (
            <span className="tnum shrink-0 text-xs text-muted">
              {exercise.target}
            </span>
          )}
        </div>
      </button>
    );
  }

  // ── Card ativo (expandido) ─────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className="anim-fade-in-up scroll-mt-20 rounded-card border bg-surface px-4 py-4"
      style={{ borderColor: accent }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3
          className="font-semibold"
          style={isSkill ? { color: accent } : undefined}
        >
          {exercise.name}
        </h3>
        <span className="tnum shrink-0 text-sm text-muted">
          {exercise.target}
        </span>
      </div>
      <p className="tnum mt-0.5 text-xs text-muted">
        última: {lastPerf ? formatLastPerf(lastPerf, parsed) : "…"}
      </p>
      {exercise.obs && (
        <p className="mt-2 text-sm leading-snug text-muted">{exercise.obs}</p>
      )}

      <div className="mt-3">
        {!adjusting ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={recordAsTarget}
              className="tap flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium active:scale-[0.99]"
              style={{ background: accent, color: "var(--color-on-accent)" }}
            >
              <CheckIcon className="h-5 w-5" />
              Fiz como previsto
            </button>
            <button
              type="button"
              onClick={startAdjust}
              className="tap rounded-xl border border-border bg-surface2 px-4 font-medium text-text"
            >
              Ajustar
            </button>
          </div>
        ) : (
          <div className="anim-fade-in flex flex-col gap-2">
            {values.map((v, i) => (
              <Stepper
                key={i}
                index={i}
                value={v}
                unit={parsed?.unit === "seconds" ? "s" : ""}
                onChange={(next) =>
                  setValues((prev) => prev.map((x, j) => (j === i ? next : x)))
                }
              />
            ))}
            <button
              type="button"
              onClick={recordAdjusted}
              className="tap mt-1 flex items-center justify-center gap-2 rounded-xl py-3 font-medium active:scale-[0.99]"
              style={{ background: accent, color: "var(--color-on-accent)" }}
            >
              <CheckIcon className="h-5 w-5" />
              Confirmar
            </button>
          </div>
        )}
      </div>

      <FlagChips
        flags={exercise.flags}
        selected={flags}
        accent={accent}
        onToggle={toggleFlag}
      />

      <ExerciseNote value={note} accent={accent} onCommit={commitNote} />

      <div className="mt-3 flex items-center justify-between gap-2">
        {onRest ? (
          <button
            type="button"
            onClick={() => onRest(restSeconds)}
            aria-label={`Iniciar descanso de ${restSeconds}s`}
            className="tap flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 font-mono text-[11px] text-muted active:scale-[0.98]"
            style={{ color: accent }}
          >
            <TimerIcon className="h-3.5 w-3.5" />
            {exercise.rest || `descanso ${restSeconds}s`}
          </button>
        ) : (
          <p className="font-mono text-[11px] text-muted">{exercise.rest}</p>
        )}
        <button
          type="button"
          onClick={recordSkipped}
          className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
        >
          pular exercício
        </button>
      </div>
    </div>
  );
}

/** Semente dos steppers ao ajustar: usa a última performance se ficou
 *  abaixo do alvo (torna a progressão visível), senão o alvo. */
function seedAdjustValues(
  parsed: PlanExercise["parsed"],
  lastPerf: LastPerf | undefined
): number[] {
  const target = adjustSets(parsed);
  if (!parsed || !lastPerf || lastPerf.kind !== "sets") return target;
  const lastSum = lastPerf.values.reduce((a, b) => a + b, 0);
  const targetSum = target.reduce((a, b) => a + b, 0);
  if (lastSum >= targetSum) return target;
  const last = lastPerf.values;
  return Array.from(
    { length: parsed.sets },
    (_, i) => last[i] ?? last[last.length - 1] ?? target[i]
  );
}

function summarize(
  log: ExerciseLog | undefined,
  parsed: PlanExercise["parsed"]
): string | null {
  if (!log || log.skipped) return null;
  if (log.as_target) return "como previsto";
  const s = effectiveSets(log, parsed);
  if (s.length === 0) return "feito";
  const unit = parsed?.unit === "seconds" ? "s" : "";
  return s.map((v) => `${v}${unit}`).join("/");
}
