"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanExercise } from "@/lib/plan/schema";
import type { ExerciseLog, SetPerformed, SetValue } from "@/lib/db/schema";
import { adjustSets, parseRestSeconds, targetSets, unitOf } from "@/lib/domain/parseTarget";
import { plannedSets, summarizeLog } from "@/lib/domain/volume";
import { exerciseSkillMapping } from "@/lib/plan/skills";
import { isClean } from "@/lib/db/queries/progressionReady";
import {
  getLastPerformance,
  formatLastPerf,
  type LastPerf,
} from "@/lib/db/queries/lastPerformance";
import { CheckIcon, PlusIcon, TimerIcon, TrashIcon, TrophyIcon } from "@/components/ui/icons";
import { Stepper } from "./Stepper";
import { SetBySetPanel } from "./SetBySetPanel";
import { recordFromSets } from "@/lib/domain/setBySet";
import { FlagChips } from "./FlagChips";
import { ExerciseNote } from "./ExerciseNote";
import { AttemptsCounter } from "./AttemptsCounter";
import { CollapsibleTip } from "./CollapsibleTip";
import { getExerciseMedia } from "@/lib/plan/media";
import { haptic } from "@/lib/utils/haptics";
import { accentVars } from "@/components/ui/accent";

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
  /** Séries já feitas deste exercício, ainda sem log (registro série a série). */
  partial?: number[];
  /** Série registrada que não fecha o exercício: grava a parcial e abre o descanso. */
  onLogSet?: (next: number[], flags: string[]) => void;
  /** Correção silenciosa da parcial (editar ou apagar uma série). */
  onSetPartial?: (values: number[]) => void;
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
  partial = [],
  onLogSet,
  onSetPartial,
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
  // Tranco ao registrar. Fica em estado (não no elemento) porque registrar
  // normalmente fecha o card: quem anima é a versão colapsada que aparece.
  // "done" existe pra o card que segue aberto não reprisar a entrada quando o
  // tranco acaba; reabrir o card zera e a entrada volta.
  const [kick, setKick] = useState<"" | "on" | "done">("");
  useEffect(() => {
    if (active) setKick((k) => (k === "done" ? "" : k));
  }, [active]);
  const kickProps = {
    onAnimationEnd: (e: React.AnimationEvent) => {
      if (e.target === e.currentTarget && e.animationName === "kick") setKick("done");
    },
  };

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

  // Flags e nota também são gravadas fora do card (sheet do "como foi?", que
  // abre ao fechar o exercício): segue o banco, senão o card reaberto mostraria
  // a cópia antiga e o próximo toque sobrescreveria o que foi marcado.
  const logFlagsKey = log?.flags_selected.join("|");
  useEffect(() => {
    if (!log) return;
    setFlags(log.flags_selected);
    setNote(log.note ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logFlagsKey, log?.note]);

  // Quantas séries o plano pede. Séries além disso, criadas no "Ajustar", viram
  // séries EXTRAS. Exercício adicionado não tem plano: toda série é "planejada".
  const plannedCount = added ? Infinity : adjustSets(parsed, exercise.target).length;
  const plannedValues = values.slice(0, plannedCount);

  /** Performance declarada pro motor de progressão — null se o exercício
   *  não estiver mapeado a um nível de skill. */
  const skillPerformed = (performed: number[] = plannedValues): SetPerformed | null => {
    if (!mapping) return null;
    const formOk = isClean({ flags_selected: flags }, exercise.neg_flags ?? []);
    if (mapping.criteria_type === "reps_rir") {
      // RIR não é mais coletado: o critério de reps avalia só reps e execução limpa
      return { type: "reps_rir", reps: performed, rir: null, form_ok: formOk };
    }
    if (mapping.criteria_type === "hold_clean") {
      return { type: "hold_clean", durations_seconds: performed, form_ok: formOk };
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
    note: note.trim() || null,
  });

  const record = (input: RecordInput) => {
    setKick("on");
    haptic(12);
    onRecord(input);
  };

  const recordAsTarget = () =>
    record({
      as_target: true,
      sets: null,
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });

  const recordAdjusted = () =>
    record({
      as_target: false,
      sets: plannedValues.map((value, index) => ({ index, value })),
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });

  const recordAttempts = () =>
    record({
      as_target: false,
      sets: null,
      skipped: false,
      sets_performed: skillPerformed(),
      ...baseInput(),
    });

  // ── Série a série ───────────────────────────────────────────────────
  // Fechar o exercício grava o mesmo log que o fluxo de exercício inteiro.
  const finishSets = (all: number[], asPlanned = false) =>
    record({
      ...(asPlanned ? { as_target: true, sets: null } : recordFromSets(all, parsed, exercise.target)),
      skipped: false,
      sets_performed: skillPerformed(all),
      ...baseInput(),
    });

  const logSet = (next: number[]) => {
    setKick("on");
    haptic(12);
    onLogSet?.(next, flags);
  };

  // Corrigir série: antes do fechamento mexe na parcial; depois, no log (silencioso).
  const editDone = (next: number[]) => {
    if (log && !log.skipped) {
      onPersist({
        ...recordFromSets(next, parsed, exercise.target),
        skipped: false,
        sets_performed: skillPerformed(next),
        ...baseInput(),
      });
    } else onSetPartial?.(next);
  };

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
        note: note.trim() || null,
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
        note: value.trim() || null,
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
  // Tudo que tem série registra série a série; tentativas seguem no contador.
  const setBySet = supportsExtra;
  const doneSets = done ? plannedSets(log, parsed, exercise.target) : partial;
  const inProgress = !done && !skipped && partial.length > 0;
  const setUnit = unitOf(parsed, exercise.target) === "seconds" ? "seconds" : "reps";
  const unitSuffix = setUnit === "seconds" ? "s" : "";
  const stepperUnit = parsed?.unit === "seconds" ? "s" : "";

  // ── Card colapsado ─────────────────────────────────────────────────
  if (!active) {
    return (
      <div
        className={`glass flex items-stretch rounded-card border bg-surface transition-colors duration-200 ${
          done ? "border-ac" : "border-border"
        } ${kick === "on" ? "anim-kick" : ""}`}
        style={accentVars(accent)}
        {...kickProps}
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
                    className="shrink-0 text-gold"
                  >
                    <TrophyIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                <p className={`truncate font-medium ${isSkill ? "text-ac" : ""}`}>
                  {exercise.name}
                </p>
              </div>
              {/* Pendente fica numa linha só: o alvo já está à direita. */}
              {(skipped || inProgress || done) && (
                <p className="tnum text-xs text-muted">
                  {inProgress
                    ? partial.map((v) => `${v}${unitSuffix}`).join("/")
                    : log && summarizeLog(log, parsed, exercise.target)}
                </p>
              )}
            </div>
            {done ? (
              <span
                className="done-mark anim-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ac text-on-accent"
                aria-label="concluído"
              >
                <CheckIcon className="h-4 w-4" />
              </span>
            ) : (
              <span className="tnum shrink-0 text-xs text-muted">
                {inProgress ? `${partial.length}/${values.length} séries` : exercise.target}
              </span>
            )}
          </div>
        </button>
        {done && supportsExtra && (
          <button
            type="button"
            onClick={onAddExtra}
            aria-label={`Adicionar série extra de ${exercise.name}`}
            className="tap flex shrink-0 items-center gap-1 border-l border-border px-3 font-mono text-2xs text-ac active:scale-[0.98]"
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
      className={`glass glass-key scroll-mt-20 rounded-card border border-ac bg-surface px-4 py-4 ${kick === "on" ? "anim-kick" : kick === "done" ? "" : "anim-fade-in-up"}`}
      style={accentVars(accent)}
      {...kickProps}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {hasPR && (
            <span
              aria-label="novo recorde nesta sessão"
              className="shrink-0 text-gold"
            >
              <TrophyIcon className="h-4 w-4" />
            </span>
          )}
          <h3 className={`display truncate text-display-sm leading-tight ${isSkill ? "text-ac" : ""}`}>
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
      <CollapsibleTip
        tip={exercise.obs}
        label="como executar"
        media={getExerciseMedia(exercise.id)}
        mediaName={exercise.name}
      />

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
              className="btn-primary tap flex items-center justify-center gap-2 rounded-xl py-3 font-medium"
            >
              <CheckIcon className="h-5 w-5" />
              Confirmar
            </button>
          </div>
        ) : setBySet ? (
          <SetBySetPanel
            unit={setUnit}
            targets={values}
            done={doneSets}
            logged={done}
            canAddSet={added}
            onTargetChange={(i, v) => setValues((prev) => prev.map((x, j) => (j === i ? v : x)))}
            onLogSet={logSet}
            onFinish={finishSets}
            onEditDone={editDone}
            onAddSet={addRow}
          />
        ) : !adjusting ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={recordAsTarget}
              className="btn-primary tap flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium"
            >
              <CheckIcon className="h-5 w-5" />
              Fiz como previsto
            </button>
            <button
              type="button"
              onClick={startAdjust}
              className="btn-secondary tap rounded-xl px-4 font-medium"
            >
              Ajustar
            </button>
          </div>
        ) : (
          // Ajustar à mão: só tentativas sem placar chegam aqui (o resto é série a série).
          <div className="anim-fade-in flex flex-col gap-2">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <Stepper
                  index={i}
                  value={v}
                  unit={stepperUnit}
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
            ))}
            <button
              type="button"
              onClick={recordAdjusted}
              className="btn-primary tap mt-1 flex items-center justify-center gap-2 rounded-xl py-3 font-medium active:scale-[0.99]"
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
              <p className="eyebrow mb-2">
                Séries extras
              </p>
              <div className="flex flex-col gap-2">
                {extraVals.map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Stepper
                      index={loggedPlannedCount + i}
                      value={v}
                      unit={stepperUnit}
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
            className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-ac active:scale-[0.99]"
          >
            <PlusIcon className="h-4 w-4" />
            Série extra
          </button>
        </div>
      )}

      {/* "Como foi?" e nota são marcados no sheet que abre ao fechar o exercício;
          aqui só aparecem pra corrigir, com o card de um exercício já feito. */}
      {done && (
        <>
          <FlagChips flags={exercise.flags} selected={flags} onToggle={toggleFlag} />
          <ExerciseNote value={note} onCommit={commitNote} />
        </>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {onRest ? (
          <button
            type="button"
            onClick={() => onRest(restSeconds)}
            aria-label={`Iniciar descanso de ${restSeconds}s`}
            className="tap flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 font-mono text-2xs text-ac active:scale-[0.98]"
          >
            <TimerIcon className="h-3.5 w-3.5" />
            {exercise.rest || `descanso ${restSeconds}s`}
          </button>
        ) : (
          <p className="font-mono text-2xs text-muted">{exercise.rest}</p>
        )}
        {added && !log ? (
          <button
            type="button"
            onClick={onRemove}
            className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-2xs text-muted"
          >
            remover do treino
          </button>
        ) : (
          <button
            type="button"
            onClick={recordSkipped}
            className="tap -mr-1 rounded-lg px-2 py-1 font-mono text-2xs text-muted"
          >
            pular exercício
          </button>
        )}
      </div>
    </div>
  );
}

/** Semente dos steppers ao ajustar: usa a última performance se ficou
 *  abaixo do alvo (torna a progressão visível), senão o teto da faixa.
 *  "Abaixo" é contra o PISO: é ele que conta como alvo batido na progressão. */
function seedAdjustValues(
  parsed: PlanExercise["parsed"],
  targetText: string,
  lastPerf: LastPerf | undefined
): number[] {
  const target = adjustSets(parsed, targetText);
  if (!lastPerf || lastPerf.kind !== "sets") return target;
  const lastSum = lastPerf.values.reduce((a, b) => a + b, 0);
  const floorSum = targetSets(parsed, targetText).reduce((a, b) => a + b, 0);
  if (lastSum >= floorSum) return target;
  const last = lastPerf.values;
  return Array.from(
    { length: target.length },
    (_, i) => last[i] ?? last[last.length - 1] ?? target[i]
  );
}
