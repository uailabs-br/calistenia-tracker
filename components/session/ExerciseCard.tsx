"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanExercise } from "@/lib/plan/schema";
import type { ExerciseLog, SetPerformed, SetValue } from "@/lib/db/schema";
import { adjustSets, formatExtras, parseRestSeconds } from "@/lib/domain/parseTarget";
import { extraSets, plannedSets } from "@/lib/domain/volume";
import { exerciseSkillMapping } from "@/lib/plan/skills";
import { isClean } from "@/lib/db/queries/progressionReady";
import {
  getLastPerformance,
  formatLastPerf,
  type LastPerf,
} from "@/lib/db/queries/lastPerformance";
import { CheckIcon, PlusIcon, TimerIcon, TrashIcon, TrophyIcon } from "@/components/ui/icons";
import { Stepper } from "./Stepper";
import { FlagChips } from "./FlagChips";
import { ExerciseNote } from "./ExerciseNote";
import { AttemptsCounter } from "./AttemptsCounter";

export interface RecordInput {
  as_target: boolean;
  sets: SetValue[] | null;
  flags_selected: string[];
  note: string | null;
  skipped: boolean;
  sets_performed?: SetPerformed | null;
  /** Séries além do planejado, feitas neste registro. `undefined` mantém as já gravadas. */
  extra_sets?: number[] | null;
}

interface Props {
  exercise: PlanExercise;
  isSkill: boolean;
  accent: string;
  sessionId: string;
  log: ExerciseLog | undefined;
  /** Recorde pessoal batido nesta sessão — mostra troféu fixo no card. */
  hasPR?: boolean;
  active: boolean;
  onActivate: () => void;
  /** Ação de registro (avança, dá undo e inicia descanso). */
  onRecord: (input: RecordInput) => void;
  /** Persistência silenciosa (flags/nota) — sem avançar nem tocar o descanso. */
  onPersist: (input: RecordInput) => void;
  /** Inicia um descanso manual (entre séries) com a duração em segundos. */
  onRest?: (seconds: number) => void;
  /** Soma uma série extra (valor sugerido = última série feita). */
  onAddExtra: () => void;
  /** Grava as séries extras editadas (silencioso). */
  onSetExtras: (values: number[]) => Promise<void> | void;
  /** Exercício acrescentado durante o treino (sem alvo do plano): abre já em "Ajustar". */
  added?: boolean;
  /** Tira do treino um exercício adicionado ainda sem registro. */
  onRemove?: () => void;
}

export function ExerciseCard({
  exercise,
  isSkill,
  accent,
  sessionId,
  log,
  hasPR,
  active,
  onActivate,
  onRecord,
  onPersist,
  onRest,
  onAddExtra,
  onSetExtras,
  added = false,
  onRemove,
}: Props) {
  const parsed = exercise.parsed;
  const restSeconds = parseRestSeconds(exercise.rest) ?? 90;
  const mapping = exerciseSkillMapping(exercise.id);

  const [adjusting, setAdjusting] = useState(added);
  const [values, setValues] = useState<number[]>(() =>
    adjustSets(parsed, exercise.target)
  );
  const [flags, setFlags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [attemptsTotal, setAttemptsTotal] = useState(0);
  const [attemptsGood, setAttemptsGood] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Séries extras: estado local (edição fluida com press-and-hold), gravado com
  // debounce. `extrasSeen` guarda o último valor já em sincronia com o banco —
  // o eco da nossa própria gravação é ignorado; mudança externa (botão "+ extra"
  // do card fechado) é adotada.
  const [extraVals, setExtraVals] = useState<number[]>([]);
  const extrasSeen = useRef("[]");
  const extrasTimer = useRef<number | null>(null);
  useEffect(() => {
    const incoming = JSON.stringify(log?.extra_sets ?? []);
    if (incoming === extrasSeen.current) return;
    extrasSeen.current = incoming;
    setExtraVals(log?.extra_sets ?? []);
  }, [log?.extra_sets]);

  const flushExtras = async (next: number[]) => {
    extrasTimer.current = null;
    extrasSeen.current = JSON.stringify(next);
    await onSetExtras(next);
  };
  const editExtras = (next: number[]) => {
    setExtraVals(next);
    if (extrasTimer.current) window.clearTimeout(extrasTimer.current);
    extrasTimer.current = window.setTimeout(() => void flushExtras(next), 350);
  };
  // Grava edição pendente ANTES de somar outra: senão o debounce sobrescreveria a nova.
  const addExtra = async () => {
    if (extrasTimer.current) {
      window.clearTimeout(extrasTimer.current);
      await flushExtras(extraVals);
    }
    onAddExtra();
  };

  // Sincroniza estado local com o log persistido (retomada / edição)
  useEffect(() => {
    if (log) {
      setFlags(log.flags_selected);
      setNote(log.note ?? "");
      const s = plannedSets(log, parsed, exercise.target);
      if (s.length > 0) setValues(s);
      else setValues(adjustSets(parsed, exercise.target));
      setAdjusting(!log.as_target && !log.skipped && (log.sets?.length ?? 0) > 0);
      if (log.sets_performed?.type === "skill_consistency") {
        setAttemptsTotal(log.sets_performed.attempts_total);
        setAttemptsGood(log.sets_performed.attempts_good);
      }
    } else {
      setValues(adjustSets(parsed, exercise.target));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.id]);

  // Quantas séries o plano pede. Séries além disso, criadas no "Ajustar", viram
  // séries EXTRAS. Exercício adicionado não tem plano: toda série é "planejada".
  const plannedCount = added ? Infinity : adjustSets(parsed, exercise.target).length;
  const plannedValues = values.slice(0, plannedCount);

  /** Performance declarada pro motor de progressão — null se o exercício
   *  não estiver mapeado a um nível de skill. */
  const skillPerformed = (): SetPerformed | null => {
    if (!mapping) return null;
    const formOk = isClean({ flags_selected: flags }, exercise.neg_flags ?? []);
    if (mapping.criteria_type === "reps_rir") {
      // RIR não é mais coletado: o critério de reps avalia só reps e execução limpa
      return { type: "reps_rir", reps: plannedValues, rir: null, form_ok: formOk };
    }
    if (mapping.criteria_type === "hold_clean") {
      return { type: "hold_clean", durations_seconds: plannedValues, form_ok: formOk };
    }
    return { type: "skill_consistency", attempts_total: attemptsTotal, attempts_good: attemptsGood };
  };

  const lastPerf = useLiveQuery(
    () => getLastPerformance(exercise.id, sessionId),
    [exercise.id, sessionId]
  );

  // Exercício adicionado já abre em "Ajustar": semeia os steppers com a última
  // performance (uma vez, e só se a pessoa ainda não mexeu neles).
  const seededFromLast = useRef(false);
  useEffect(() => {
    if (!added || log || !lastPerf || seededFromLast.current) return;
    seededFromLast.current = true;
    const untouched =
      values.join() === adjustSets(parsed, exercise.target).join();
    if (untouched) setValues(seedAdjustValues(parsed, exercise.target, lastPerf));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPerf]);

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
    onRecord({
      as_target: true,
      sets: null,
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });

  const recordAdjusted = () => {
    // séries novas além do plano viram extras (somadas às que já existiam)
    const newExtras = values.slice(plannedCount);
    onRecord({
      as_target: false,
      sets: plannedValues.map((value, index) => ({ index, value })),
      ...(newExtras.length > 0
        ? { extra_sets: [...(log?.extra_sets ?? []), ...newExtras] }
        : {}),
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });
  };

  const recordAttempts = () =>
    onRecord({
      as_target: false,
      sets: null,
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });

  const recordSkipped = () =>
    onRecord({
      as_target: false,
      sets: null,
      skipped: true,
      sets_performed: null,
      ...baseInput(),
    });

  // Somar/remover séries no "Ajustar": nova série repete a última.
  const addRow = () =>
    setValues((prev) => [...prev, prev[prev.length - 1] ?? adjustSets(parsed, exercise.target)[0]]);
  const removeRow = (i: number) => setValues((prev) => prev.filter((_, j) => j !== i));

  const startAdjust = () => {
    if (!log) setValues(seedAdjustValues(parsed, exercise.target, lastPerf));
    setAdjusting(true);
  };

  const toggleFlag = (flag: string) => {
    const next = flags.includes(flag)
      ? flags.filter((f) => f !== flag)
      : [...flags, flag];
    setFlags(next);
    // se já registrado, persiste imediatamente preservando o tipo de registro
    if (log && !log.skipped) {
      const formOk = isClean({ flags_selected: next }, exercise.neg_flags ?? []);
      onPersist({
        as_target: log.as_target,
        sets: log.sets,
        flags_selected: next,
        note: note.trim() ? note.trim() : null,
        skipped: false,
        sets_performed:
          log.sets_performed && log.sets_performed.type !== "skill_consistency"
            ? { ...log.sets_performed, form_ok: formOk }
            : log.sets_performed,
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
        sets_performed: log.sets_performed,
      });
    }
  };

  const done = !!log && !log.skipped;
  const skipped = !!log?.skipped;
  // Tentativas (kick-up etc.) não têm "série": o contador já é livre.
  const supportsExtra =
    parsed?.unit !== "attempts" &&
    mapping?.criteria_type !== "skill_consistency" &&
    !/tentativa/i.test(exercise.target);
  const loggedPlannedCount = log ? plannedSets(log, parsed, exercise.target).length : 0;

  // ── Card colapsado ─────────────────────────────────────────────────
  if (!active) {
    return (
      <div
        className="flex items-stretch rounded-card border border-border bg-surface transition-colors duration-200"
        style={done ? { borderColor: accent } : undefined}
      >
        <button
          type="button"
          onClick={onActivate}
          className="min-w-0 flex-1 px-4 py-3 text-left"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                {hasPR && (
                  <span
                    aria-label="novo recorde nesta sessão"
                    className="shrink-0 text-[var(--color-gold)]"
                  >
                    <TrophyIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                <p
                  className="truncate font-medium"
                  style={isSkill ? { color: accent } : undefined}
                >
                  {exercise.name}
                </p>
              </div>
              <p className="tnum text-xs text-muted">
                {skipped
                  ? "pulado"
                  : summarize(log, parsed, exercise.target) ?? exercise.target}
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
        {done && supportsExtra && (
          <button
            type="button"
            onClick={onAddExtra}
            aria-label={`Adicionar série extra de ${exercise.name}`}
            className="tap flex shrink-0 items-center gap-1 border-l border-border px-3 font-mono text-[11px] active:scale-[0.98]"
            style={{ color: accent }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            extra
          </button>
        )}
      </div>
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
        <div className="flex min-w-0 items-center gap-1.5">
          {hasPR && (
            <span
              aria-label="novo recorde nesta sessão"
              className="shrink-0 text-[var(--color-gold)]"
            >
              <TrophyIcon className="h-4 w-4" />
            </span>
          )}
          <h3
            className="truncate font-semibold"
            style={isSkill ? { color: accent } : undefined}
          >
            {exercise.name}
          </h3>
        </div>
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
        {mapping?.criteria_type === "skill_consistency" ? (
          <div className="anim-fade-in flex flex-col gap-3">
            <AttemptsCounter
              total={attemptsTotal}
              good={attemptsGood}
              onChange={({ total, good }) => {
                setAttemptsTotal(total);
                setAttemptsGood(good);
              }}
            />
            <button
              type="button"
              onClick={recordAttempts}
              className="tap flex items-center justify-center gap-2 rounded-xl py-3 font-medium active:scale-[0.99]"
              style={{ background: accent, color: "var(--color-on-accent)" }}
            >
              <CheckIcon className="h-5 w-5" />
              Confirmar
            </button>
          </div>
        ) : !adjusting ? (
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
              <div key={i}>
                {i === plannedCount && (
                  <p className="mb-1 mt-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                    Séries extras
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Stepper
                    index={i}
                    value={v}
                    unit={parsed?.unit === "seconds" ? "s" : ""}
                    onChange={(next) =>
                      setValues((prev) => prev.map((x, j) => (j === i ? next : x)))
                    }
                  />
                  {values.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      aria-label={`Remover série ${i + 1}`}
                      className="tap ml-auto flex shrink-0 items-center justify-center rounded-lg text-muted active:scale-95 active:text-danger"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {supportsExtra && (
              <button
                type="button"
                onClick={addRow}
                className="tap flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium active:scale-[0.99]"
                style={{ color: accent }}
              >
                <PlusIcon className="h-4 w-4" />
                {added || values.length < plannedCount ? "Série" : "Série extra"}
              </button>
            )}
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

      {done && supportsExtra && (
        <div className="anim-fade-in mt-3 border-t border-border pt-3">
          {extraVals.length > 0 && (
            <>
              <p className="mb-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                Séries extras
              </p>
              <div className="flex flex-col gap-2">
                {extraVals.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Stepper
                      index={loggedPlannedCount + i}
                      value={v}
                      unit={parsed?.unit === "seconds" ? "s" : ""}
                      onChange={(next) =>
                        editExtras(
                          extraVals.map((x, j) => (j === i ? Math.max(1, next) : x))
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => editExtras(extraVals.filter((_, j) => j !== i))}
                      aria-label={`Remover série extra ${i + 1}`}
                      className="tap ml-auto flex shrink-0 items-center justify-center rounded-lg text-muted active:scale-95 active:text-danger"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => void addExtra()}
            className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium active:scale-[0.99]"
            style={{ color: accent }}
          >
            <PlusIcon className="h-4 w-4" />
            Série extra
          </button>
        </div>
      )}

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
        {added && !log ? (
          <button
            type="button"
            onClick={onRemove}
            className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
          >
            remover do treino
          </button>
        ) : (
          <button
            type="button"
            onClick={recordSkipped}
            className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-[11px] text-muted"
          >
            pular exercício
          </button>
        )}
      </div>
    </div>
  );
}

/** Semente dos steppers ao ajustar: usa a última performance se ficou
 *  abaixo do alvo (torna a progressão visível), senão o alvo. */
function seedAdjustValues(
  parsed: PlanExercise["parsed"],
  targetText: string,
  lastPerf: LastPerf | undefined
): number[] {
  const target = adjustSets(parsed, targetText);
  if (!lastPerf || lastPerf.kind !== "sets") return target;
  const lastSum = lastPerf.values.reduce((a, b) => a + b, 0);
  const targetSum = target.reduce((a, b) => a + b, 0);
  if (lastSum >= targetSum) return target;
  const last = lastPerf.values;
  return Array.from(
    { length: target.length },
    (_, i) => last[i] ?? last[last.length - 1] ?? target[i]
  );
}

function summarize(
  log: ExerciseLog | undefined,
  parsed: PlanExercise["parsed"],
  targetText: string
): string | null {
  if (!log || log.skipped) return null;
  if (log.sets_performed?.type === "skill_consistency") {
    const { attempts_good, attempts_total } = log.sets_performed;
    return `${attempts_good}/${attempts_total} tentativas`;
  }
  const extra = formatExtras(extraSets(log), parsed);
  const s = plannedSets(log, parsed, targetText);
  if (s.length === 0) return `${log.as_target ? "como previsto" : "feito"}${extra}`;
  const unit = parsed?.unit === "seconds" ? "s" : "";
  return `${s.map((v) => `${v}${unit}`).join("/")}${extra}`;
}
