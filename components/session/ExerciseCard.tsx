"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanExercise } from "@/lib/plan/schema";
import type { ExerciseLog, SetValue } from "@/lib/db/schema";
import { targetSets } from "@/lib/domain/parseTarget";
import { effectiveSets } from "@/lib/domain/volume";
import {
  getLastPerformance,
  formatLastPerf,
} from "@/lib/db/queries/lastPerformance";
import { CheckIcon } from "@/components/ui/icons";
import { Stepper } from "./Stepper";
import { FlagChips } from "./FlagChips";

export interface RecordInput {
  as_target: boolean;
  sets: SetValue[] | null;
  flags_selected: string[];
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
  onRecord: (input: RecordInput) => void;
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
}: Props) {
  const parsed = exercise.parsed;
  const hasStepper = parsed !== null;

  const [adjusting, setAdjusting] = useState(false);
  const [values, setValues] = useState<number[]>(() => targetSets(parsed));
  const [flags, setFlags] = useState<string[]>([]);

  // Sincroniza estado local com o log persistido (retomada / edição)
  useEffect(() => {
    if (log) {
      setFlags(log.flags_selected);
      const s = effectiveSets(log, parsed);
      if (s.length > 0) setValues(s);
      else setValues(targetSets(parsed));
      setAdjusting(!log.as_target && !log.skipped && (log.sets?.length ?? 0) > 0);
    } else {
      setValues(targetSets(parsed));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.id]);

  const lastPerf = useLiveQuery(
    () => getLastPerformance(exercise.id, sessionId),
    [exercise.id, sessionId]
  );

  // ── long-press para pular ──────────────────────────────────────────
  const pressTimer = useRef<number | null>(null);
  const startPress = () => {
    pressTimer.current = window.setTimeout(() => {
      onRecord({ as_target: false, sets: null, flags_selected: flags, skipped: true });
      pressTimer.current = null;
    }, 550);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const recordAsTarget = () =>
    onRecord({ as_target: true, sets: null, flags_selected: flags, skipped: false });

  const recordAdjusted = () =>
    onRecord({
      as_target: false,
      sets: values.map((value, index) => ({ index, value })),
      flags_selected: flags,
      skipped: false,
    });

  const toggleFlag = (flag: string) => {
    const next = flags.includes(flag)
      ? flags.filter((f) => f !== flag)
      : [...flags, flag];
    setFlags(next);
    // se já registrado, persiste imediatamente preservando o tipo de registro
    if (log && !log.skipped) {
      onRecord({
        as_target: log.as_target,
        sets: log.sets,
        flags_selected: next,
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
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: accent, color: "#0e0e0f" }}
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
      className="rounded-card border bg-surface px-4 py-4"
      style={{ borderColor: accent }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
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
              style={{ background: accent, color: "#0e0e0f" }}
            >
              <CheckIcon className="h-5 w-5" />
              {hasStepper ? "fiz como previsto" : "feito"}
            </button>
            {hasStepper && (
              <button
                type="button"
                onClick={() => setAdjusting(true)}
                className="tap rounded-xl border border-border bg-surface2 px-4 font-medium text-text"
              >
                ajustar
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
              style={{ background: accent, color: "#0e0e0f" }}
            >
              <CheckIcon className="h-5 w-5" />
              confirmar
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

      <p className="mt-3 font-mono text-[11px] text-muted">
        {exercise.rest} · segure p/ pular
      </p>
    </div>
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
