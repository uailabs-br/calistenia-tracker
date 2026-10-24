"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import type { Session, ExerciseLog } from "@/lib/db/schema";
import {
  addExtraSet,
  getLogsForSession,
  setExtraSets,
  upsertLog,
  removeLog,
  setLogFeedback,
} from "@/lib/db/repositories/logs";
import { isClean } from "@/lib/db/queries/progressionReady";
import {
  addExerciseToSession,
  completeSession,
  discardSession,
  removeAddedExercise,
  setPartialSets,
} from "@/lib/db/repositories/sessions";
import {
  createCustomExercise,
  getCustomExercises,
  type CustomExerciseInput,
} from "@/lib/db/repositories/customExercises";
import { getCatalogExercise } from "@/lib/plan/catalog";
import { getRecentExerciseIds } from "@/lib/db/queries/recentExercises";
import { resolveAddedExercise } from "@/lib/plan/addedExercises";
import { formatValue, parseRestSeconds } from "@/lib/domain/parseTarget";
import { resolveLogExercise, snapshotOf } from "@/lib/plan/resolve";
import { recordFromSets } from "@/lib/domain/setBySet";
import {
  extraSeed,
  extraSets,
  plannedSetsCount,
  repsVolume as sumRepsVolume,
} from "@/lib/domain/volume";
import { getPreviousRepsVolume } from "@/lib/db/queries/previousWorkout";
import { computePR, formatPR, type PRResult } from "@/lib/db/queries/pr";
import { useWakeLock } from "@/lib/utils/useWakeLock";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlusIcon } from "@/components/ui/icons";
import { accentVars } from "@/components/ui/accent";
import { ExerciseCard, type RecordInput } from "./ExerciseCard";
import { AddExerciseSheet } from "./AddExerciseSheet";
import { RpeSheet } from "./RpeSheet";
import { RestTimer } from "./RestTimer";
import { ExerciseFeedbackSheet } from "./ExerciseFeedbackSheet";
import { PRMoment } from "./PRMoment";
import { SessionSummary } from "./SessionSummary";
import { CollapsibleTip } from "./CollapsibleTip";
import { WarmupCard } from "./WarmupCard";

export function SessionRunner({
  session,
  workout,
  onCompleted,
  onFinished,
  initialExerciseId,
}: {
  session: Session;
  workout: Workout;
  /** Disparado ANTES de gravar a sessão como concluída — sinaliza o pai pra
   *  não desmontar o runner quando a query de "sessão ativa" cair pra null.
   *  Precisa vir antes da gravação: se viesse depois, teria uma janela em que
   *  a sessão ativa já sumiu do banco mas o pai ainda não sabe segurar o render,
   *  e o runner remonta do zero (perdendo a tela de resumo). */
  onCompleted?: () => void;
  onFinished: () => void;
  /** Deep-link: abre focado neste exercício (botão "play" da home). */
  initialExerciseId?: string;
}) {
  useWakeLock(true);
  const { toast } = useToast();

  const planFlat = useMemo(
    () =>
      workout.blocks.flatMap((block) =>
        block.exercises.map((exercise) => ({
          exercise,
          isSkill: block.is_skill,
          blockLabel: block.label,
          added: false,
        }))
      ),
    [workout]
  );

  const logs = useLiveQuery(() => getLogsForSession(session.id), [session.id]);
  const logByExercise = useMemo(() => {
    const m = new Map<string, ExerciseLog>();
    (logs ?? []).forEach((l) => m.set(l.exercise_id, l));
    return m;
  }, [logs]);

  // Exercícios acrescentados durante o treino (catálogo ou criados por você),
  // no fim, sob um bloco próprio. Um id que já é do plano do dia não duplica.
  const customs = useLiveQuery(() => getCustomExercises(), []);
  const recentIds = useLiveQuery(() => getRecentExerciseIds(), []);
  const addedKey = (session.added_exercises ?? []).join("|");
  const addedItems = useMemo(() => {
    const inPlan = new Set(planFlat.map((f) => f.exercise.id));
    return (session.added_exercises ?? [])
      .filter((id) => !inPlan.has(id))
      .flatMap((id) => {
        const exercise = resolveAddedExercise(
          id,
          customs ?? [],
          logByExercise.get(id)?.snapshot
        );
        return exercise
          ? [{ exercise, isSkill: false, blockLabel: "Adicionados ao treino", added: true }]
          : [];
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedKey, planFlat, customs, logByExercise]);
  const flat = useMemo(() => [...planFlat, ...addedItems], [planFlat, addedItems]);
  const itemOf = (exerciseId: string) => flat.find((f) => f.exercise.id === exerciseId);

  // Índice ativo: primeiro exercício sem log (retomada vem do banco)
  const firstUnlogged = flat.findIndex((f) => !logByExercise.has(f.exercise.id));
  const [manualActive, setManualActive] = useState<number | null>(null);
  const activeIndex = manualActive ?? firstUnlogged;

  // Deep-link "play": foca e rola até o exercício pedido, uma única vez.
  const jumpedTo = useRef<string | null>(null);
  useEffect(() => {
    if (!initialExerciseId || jumpedTo.current === initialExerciseId) return;
    const idx = flat.findIndex((f) => f.exercise.id === initialExerciseId);
    if (idx === -1) return;
    jumpedTo.current = initialExerciseId;
    setManualActive(idx);
    // aguarda o card montar antes de rolar
    requestAnimationFrame(() => {
      document
        .getElementById(`ex-${initialExerciseId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [initialExerciseId, flat]);

  const [showRpe, setShowRpe] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  // Recém-adicionado: abre o cartão dele assim que entrar na lista.
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    const idx = flat.findIndex((f) => f.exercise.id === focusId);
    if (idx === -1) return;
    setManualActive(idx);
    setFocusId(null);
  }, [focusId, flat]);
  const [rest, setRest] = useState<{ seconds: number; key: number } | null>(null);
  // Recordes desta sessão — troféu fixo no card (toast some, o card fica) e
  // lista na tela de fechamento do treino.
  const [prResults, setPrResults] = useState<Map<string, PRResult>>(new Map());
  // Recorde acabado de bater: abre a tela cheia por cima do descanso.
  const [prMoment, setPrMoment] = useState<{ name: string; pr: PRResult } | null>(null);
  // Descanso manual entre séries, disparado pelo card ativo.
  const startRest = (seconds: number) => setRest({ seconds, key: Date.now() });
  // Descanso do plano pro exercício; sem tempo no plano, não abre.
  const restSecondsOf = (exerciseId: string) =>
    parseRestSeconds(itemOf(exerciseId)?.exercise.rest ?? "");
  const forgetPR = (exerciseId: string) =>
    setPrResults((m) => {
      if (!m.has(exerciseId)) return m;
      const next = new Map(m);
      next.delete(exerciseId);
      return next;
    });
  // Exercício acabado de fechar: o "como foi?" aparece antes do descanso. `at`
  // é a hora do registro (o tempo no sheet já conta como descanso).
  const [feedback, setFeedback] = useState<{
    exerciseId: string;
    input: RecordInput;
    at: number;
    undo: () => Promise<void>;
  } | null>(null);

  const pending = flat.filter((f) => !logByExercise.has(f.exercise.id)).length;
  const doneCount = flat.length - pending;
  const progressPct = flat.length > 0 ? (doneCount / flat.length) * 100 : 0;
  // Reps totais da sessão. Cada exercício é lido pelo resolver (snapshot do log),
  // não pelo plano vigente — ver regra 5 do CLAUDE.md.
  const volumeEntries = (logs ?? []).map((log) => {
    const ex = resolveLogExercise(log, session.workout_id);
    return { log, parsed: ex.parsed, target: ex.target };
  });
  const repsVolume = sumRepsVolume(volumeEntries);

  // Fechamento do treino: séries planejadas, extras à parte, e só exercício feito.
  const setsCount = plannedSetsCount(volumeEntries);
  const extraSetsCount = (logs ?? []).reduce((n, l) => n + extraSets(l).length, 0);
  const exercisesDone = (logs ?? []).filter((l) => !l.skipped).length;
  // Gravado ao finalizar: duração e a comparação com a última vez deste treino.
  const [summaryStats, setSummaryStats] = useState<{
    minutes: number;
    prevRepsVolume: number | null;
  } | null>(null);

  const advanceFrom = (exerciseId: string) => {
    const idx = flat.findIndex((f) => f.exercise.id === exerciseId);
    const nextUnlogged = flat.findIndex(
      (f, i) =>
        i > idx &&
        !logByExercise.has(f.exercise.id) &&
        f.exercise.id !== exerciseId
    );
    setManualActive(nextUnlogged === -1 ? -1 : nextUnlogged);
  };

  const undoRecord = async (
    exerciseId: string,
    prev: ExerciseLog | undefined,
    prevPartial: number[] | null
  ) => {
    try {
      // série a série: desfazer o fechamento devolve as séries de antes pra parcial
      if (prevPartial) await setPartialSets(session.id, exerciseId, prevPartial);
      if (prev) {
        await upsertLog({
          session_id: session.id,
          exercise_id: exerciseId,
          as_target: prev.as_target,
          sets: prev.sets,
          flags_selected: prev.flags_selected,
          note: prev.note,
          skipped: prev.skipped,
          sets_performed: prev.sets_performed,
          extra_sets: prev.extra_sets ?? null,
        });
      } else {
        await removeLog(session.id, exerciseId);
      }
      setRest(null);
      setFeedback(null);
      forgetPR(exerciseId);
      const idx = flat.findIndex((f) => f.exercise.id === exerciseId);
      if (idx !== -1) setManualActive(idx);
    } catch {
      toast({ message: "Não foi possível desfazer.", variant: "error" });
    }
  };

  // Alvo/nome do exercício NESTE momento, gravado no log (ver ExerciseSnapshot).
  const snapshotFor = (exerciseId: string) => {
    const ex = itemOf(exerciseId)?.exercise;
    return ex ? snapshotOf(ex) : null;
  };

  // Ação de registro: persiste, avança, oferece undo e inicia o descanso.
  const handleRecord = async (exerciseId: string, input: RecordInput) => {
    const prev = logByExercise.get(exerciseId);
    const prevPartial = session.partial_sets?.[exerciseId] ?? null;
    try {
      await upsertLog({
        session_id: session.id,
        exercise_id: exerciseId,
        snapshot: snapshotFor(exerciseId),
        ...input,
      });
      // fechou: a parcial virou log e não pode sobrar pra ser lida duas vezes
      if (prevPartial) await setPartialSets(session.id, exerciseId, null);
    } catch {
      toast({
        message: "Não foi possível registrar. Tente de novo.",
        variant: "error",
      });
      return;
    }

    advanceFrom(exerciseId);

    const undo = () => undoRecord(exerciseId, prev, prevPartial);

    // Primeiro fechamento: o "como foi?" vem antes do recorde e do descanso.
    // Recorde só vale com execução limpa, então espera as marcações. O desfazer
    // fica no próprio sheet: o toast, embaixo, cobriria o botão.
    if (!input.skipped && !prev) {
      setRest(null);
      setFeedback({ exerciseId, input, at: Date.now(), undo });
      return;
    }

    const pr = input.skipped ? null : await celebratePR(exerciseId, input);

    toast(
      pr
        ? prToast(pr, exerciseId, undo)
        : {
            message: input.skipped ? "Exercício pulado" : "Registrado",
            action: { label: "Desfazer", onClick: undo },
          }
    );

    // Descanso automático (não para exercícios pulados)
    if (!input.skipped) {
      const secs = restSecondsOf(exerciseId);
      setRest(secs ? { seconds: secs, key: Date.now() } : null);
    }
  };

  // PR fica mais tempo na tela — mensagem mais longa, lida ofegante no meio do treino.
  const prToast = (pr: PRResult, exerciseId: string, onUndo: () => void) => ({
    message: `🏆 Novo recorde — ${formatPR(pr)} de ${itemOf(exerciseId)?.exercise.name ?? ""}`,
    variant: "success" as const,
    duration: 6500,
    action: { label: "Desfazer", onClick: onUndo },
  });

  // Recorde de um registro (exercício fechado, série ou série extra). Pode já ter
  // sido festejado antes na mesma sessão, e aí só um valor maior festeja de novo.
  const celebratePR = async (
    exerciseId: string,
    log: Parameters<typeof computePR>[1]
  ): Promise<PRResult | null> => {
    const item = itemOf(exerciseId);
    let pr: PRResult | null = null;
    try {
      pr = await computePR(exerciseId, log, item?.exercise.parsed ?? null);
    } catch {
      /* PR é enfeite: nunca bloqueia o registro */
    }
    const prPrev = prResults.get(exerciseId);
    if (pr && prPrev && pr.value <= prPrev.value) pr = null;
    if (pr) {
      setPrResults((m) => new Map(m).set(exerciseId, pr as PRResult));
      setPrMoment({ name: item?.exercise.name ?? "", pr });
    }
    return pr;
  };

  // "Concluir exercício" no sheet: grava o como foi, festeja o recorde (se a
  // execução foi limpa) e abre o descanso com o tempo que sobrou.
  const finishFeedback = async (flags: string[], note: string) => {
    if (!feedback) return;
    const { exerciseId, input, at, undo } = feedback;
    setFeedback(null);
    const negFlags = itemOf(exerciseId)?.exercise.neg_flags ?? [];

    if (flags.length > 0 || note.trim()) {
      try {
        await setLogFeedback(session.id, exerciseId, flags, note, negFlags);
      } catch {
        toast({ message: "Não foi possível salvar como foi.", variant: "error" });
      }
    }

    // Execução suja não é recorde: nem agora, nem o festejado numa série antes.
    let pr: PRResult | null = null;
    if (isClean({ flags_selected: flags }, negFlags)) {
      pr = await celebratePR(exerciseId, { ...input, flags_selected: flags });
    } else {
      forgetPR(exerciseId);
    }
    if (pr) toast(prToast(pr, exerciseId, undo));

    const secs = restSecondsOf(exerciseId);
    const left = secs ? secs - Math.round((Date.now() - at) / 1000) : 0;
    setRest(left > 0 ? { seconds: left, key: Date.now() } : null);
  };
  const feedbackItem = feedback ? itemOf(feedback.exerciseId) : undefined;

  // Série a série: série que não fecha o exercício. Grava a parcial no banco
  // (retomada), festeja recorde na hora e abre o descanso. Sem toast: corrigir
  // é tocar na série, e um aviso por série seria ruído no meio do treino.
  const handleLogSet = async (exerciseId: string, values: number[], flags: string[]) => {
    try {
      await setPartialSets(session.id, exerciseId, values);
    } catch {
      toast({ message: "Não foi possível registrar a série. Tente de novo.", variant: "error" });
      return;
    }

    const secs = restSecondsOf(exerciseId);
    if (secs) startRest(secs);

    const value = values[values.length - 1];
    await celebratePR(exerciseId, {
      as_target: false,
      sets: [{ index: 0, value }],
      skipped: false,
      flags_selected: flags,
    });
  };

  const handleSetPartial = async (exerciseId: string, values: number[]) => {
    try {
      await setPartialSets(session.id, exerciseId, values);
    } catch {
      toast({ message: "Não foi possível salvar a série.", variant: "error" });
    }
  };

  // Persistência silenciosa (flags/nota de um exercício já registrado).
  const handlePersist = async (exerciseId: string, input: RecordInput) => {
    try {
      await upsertLog({
        session_id: session.id,
        exercise_id: exerciseId,
        snapshot: snapshotFor(exerciseId),
        ...input,
      });
    } catch {
      toast({ message: "Não foi possível salvar.", variant: "error" });
    }
  };

  // Série extra: feita além do planejado. Soma no fim, conta no volume/recorde,
  // dá descanso e oferece desfazer (volta ao que havia antes).
  const handleAddExtra = async (exerciseId: string) => {
    const log = logByExercise.get(exerciseId);
    const item = itemOf(exerciseId);
    if (!log || log.skipped || !item) return;
    const { parsed, target } = item.exercise;
    const prevExtras = log.extra_sets ?? [];
    const value = extraSeed(log, parsed, target);

    try {
      await addExtraSet(session.id, exerciseId, value);
    } catch {
      toast({ message: "Não foi possível adicionar a série extra.", variant: "error" });
      return;
    }

    // A série extra pode ser recorde por si só — mas não repete o troféu que a
    // própria sessão já deu com valor igual ou maior.
    const prPrev = prResults.get(exerciseId);
    const pr = await celebratePR(exerciseId, {
      as_target: false,
      sets: [{ index: 0, value }],
      skipped: false,
      flags_selected: log.flags_selected,
    });

    const undo = async () => {
      try {
        await setExtraSets(session.id, exerciseId, prevExtras);
        setRest(null);
        setPrResults((m) => {
          const next = new Map(m);
          if (prPrev) next.set(exerciseId, prPrev);
          else next.delete(exerciseId);
          return next;
        });
      } catch {
        toast({ message: "Não foi possível desfazer.", variant: "error" });
      }
    };
    toast(
      pr
        ? prToast(pr, exerciseId, undo)
        : {
            message: `Série extra: ${formatValue(value, parsed)}`,
            action: { label: "Desfazer", onClick: undo },
          }
    );

    const secs = restSecondsOf(exerciseId);
    if (secs) startRest(secs);
  };

  // Edição das extras no card aberto: silenciosa (sem toast, sem descanso).
  const handleSetExtras = async (exerciseId: string, values: number[]) => {
    try {
      await setExtraSets(session.id, exerciseId, values);
    } catch {
      toast({ message: "Não foi possível salvar as séries extras.", variant: "error" });
    }
  };

  // ── Exercícios acrescentados durante o treino ─────────────────────────────
  const addedName = (id: string) =>
    getCatalogExercise(id)?.name ?? customs?.find((c) => c.id === id)?.name ?? "Exercício";

  const handlePickAdded = async (id: string) => {
    let updated: Awaited<ReturnType<typeof addExerciseToSession>>;
    try {
      updated = await addExerciseToSession(session.id, id);
    } catch {
      updated = null;
    }
    if (!updated) {
      toast({ message: "Não foi possível adicionar o exercício.", variant: "error" });
      return;
    }
    setShowAdd(false);
    setFocusId(id);
    toast({
      message: `${addedName(id)} adicionado`,
      action: { label: "Desfazer", onClick: () => void handleRemoveAdded(id, true) },
    });
  };

  // Cria o exercício próprio e já o coloca no treino. Erros voltam pra sheet.
  const handleCreateAdded = async (input: CustomExerciseInput) => {
    const created = await createCustomExercise(input);
    const updated = await addExerciseToSession(session.id, created.id);
    if (!updated) throw new Error("Não foi possível adicionar ao treino.");
    setShowAdd(false);
    setFocusId(created.id);
    toast({ message: `${created.name} criado e adicionado` });
  };

  const handleRemoveAdded = async (id: string, silent = false) => {
    try {
      const ok = await removeAddedExercise(session.id, id);
      if (!ok) {
        if (!silent) toast({ message: "Este exercício já foi registrado.", variant: "error" });
        return;
      }
      setManualActive(null); // o índice antigo pode ter saído da lista
    } catch {
      toast({ message: "Não foi possível remover.", variant: "error" });
    }
  };

  const confirmFinalize = async (rpe: number, note: string) => {
    // Antes de gravar: evita o gap em que a sessão já sumiu do banco mas o
    // pai ainda não sabe que precisa manter o runner montado.
    onCompleted?.();
    try {
      // Exercício largado no meio: as séries feitas valem como registro, do jeito
      // que o "terminar com N séries" gravaria. Sem flags: o "como foi?" só
      // aparece ao fechar o exercício.
      for (const [exerciseId, values] of Object.entries(session.partial_sets ?? {})) {
        const item = itemOf(exerciseId);
        if (!item || logByExercise.has(exerciseId) || values.length === 0) continue;
        await upsertLog({
          session_id: session.id,
          exercise_id: exerciseId,
          snapshot: snapshotFor(exerciseId),
          ...recordFromSets(values, item.exercise.parsed, item.exercise.target),
          flags_selected: [],
          note: null,
          skipped: false,
        });
        await setPartialSets(session.id, exerciseId, null);
      }
      await completeSession(session.id, rpe, note);
      let prevRepsVolume: number | null = null;
      try {
        prevRepsVolume = await getPreviousRepsVolume(session.id, session.workout_id);
      } catch {
        /* comparação é enfeite: nunca bloqueia o fechamento */
      }
      setSummaryStats({
        minutes: Math.max(1, Math.round((Date.now() - session.started_at) / 60000)),
        prevRepsVolume,
      });
      setShowRpe(false);
      setShowSummary(true);
    } catch {
      toast({
        message: "Falha ao finalizar. Seus registros estão salvos.",
        variant: "error",
      });
    }
  };

  const confirmExit = async () => {
    try {
      await discardSession(session.id);
      setShowExit(false);
      onFinished();
    } catch {
      toast({ message: "Falha ao descartar a sessão.", variant: "error" });
    }
  };

  let lastBlock = "";

  return (
    <div className="anim-fade-in px-4" style={accentVars(workout.accent, workout.accent_bg)}>
      {/* Barra de progresso da sessão */}
      <div className="sticky top-0 z-20 -mx-4 mb-2 bg-bg/85 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full bg-ac transition-[width] duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="tnum shrink-0 text-xs text-muted">
            {doneCount}/{flat.length}
          </span>
        </div>
      </div>

      {/* Título → progresso (acima) → por que → aquecimento → exercícios */}
      <CollapsibleTip tip={workout.tip} />
      {workout.warmup && (
        <div className="mb-3 mt-3">
          <WarmupCard warmup={workout.warmup} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {flat.map((item, i) => {
          const showBlock = item.blockLabel !== lastBlock;
          lastBlock = item.blockLabel;
          return (
            <div key={item.exercise.id} id={`ex-${item.exercise.id}`}>
              {showBlock && (
                <p className="eyebrow mb-1 mt-3">
                  {item.blockLabel}
                </p>
              )}
              <ExerciseCard
                exercise={item.exercise}
                isSkill={item.isSkill}
                accent={workout.accent}
                sessionId={session.id}
                log={logByExercise.get(item.exercise.id)}
                hasPR={prResults.has(item.exercise.id)}
                active={i === activeIndex}
                onActivate={() => setManualActive(i)}
                onRecord={(input) => handleRecord(item.exercise.id, input)}
                onPersist={(input) => handlePersist(item.exercise.id, input)}
                onRest={startRest}
                onAddExtra={() => handleAddExtra(item.exercise.id)}
                onSetExtras={(values) => handleSetExtras(item.exercise.id, values)}
                added={item.added}
                onRemove={() => handleRemoveAdded(item.exercise.id)}
                partial={session.partial_sets?.[item.exercise.id]}
                onLogSet={(values, flags) => void handleLogSet(item.exercise.id, values, flags)}
                onSetPartial={(values) => void handleSetPartial(item.exercise.id, values)}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="btn-outline tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-dashed py-3 text-sm font-medium active:scale-[0.99]"
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar exercício
      </button>

      <button
        type="button"
        onClick={() => setShowRpe(true)}
        className="btn-outline tap mt-6 w-full rounded-xl py-3 font-medium"
      >
        Finalizar treino
      </button>

      <button
        type="button"
        onClick={() => setShowExit(true)}
        className="tap mt-2 mb-2 w-full rounded-xl py-3 text-sm font-medium text-muted"
      >
        Sair sem salvar
      </button>

      {feedback && feedbackItem && (
        <ExerciseFeedbackSheet
          key={feedback.exerciseId}
          exerciseName={feedbackItem.exercise.name}
          flags={feedbackItem.exercise.flags}
          accent={workout.accent}
          onDone={(flags, note) => void finishFeedback(flags, note)}
          onUndo={() => void feedback.undo()}
        />
      )}

      {rest && (
        <RestTimer
          key={rest.key}
          seconds={rest.seconds}
          accent={workout.accent}
          onDone={() => setRest(null)}
        />
      )}

      {prMoment && (
        <PRMoment
          exerciseName={prMoment.name}
          pr={prMoment.pr}
          onClose={() => setPrMoment(null)}
        />
      )}

      {showAdd && (
        <AddExerciseSheet
          accent={workout.accent}
          presentIds={new Set(flat.map((f) => f.exercise.id))}
          customExercises={customs ?? []}
          recentIds={recentIds ?? []}
          onPick={(id) => void handlePickAdded(id)}
          onCreate={handleCreateAdded}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showRpe && (
        <RpeSheet
          accent={workout.accent}
          pendingCount={pending}
          onConfirm={confirmFinalize}
          onCancel={() => setShowRpe(false)}
        />
      )}

      {showSummary && (
        <SessionSummary
          workout={workout}
          exercisesDone={exercisesDone}
          exercisesTotal={flat.length}
          repsVolume={repsVolume}
          prevRepsVolume={summaryStats?.prevRepsVolume ?? null}
          setsCount={setsCount}
          extraSets={extraSetsCount}
          minutes={summaryStats?.minutes ?? 1}
          prs={Array.from(prResults.entries()).map(([id, pr]) => ({
            id,
            name: itemOf(id)?.exercise.name ?? id,
            pr,
          }))}
          onClose={() => {
            setShowSummary(false);
            onFinished();
          }}
        />
      )}

      {showExit && (
        <ConfirmDialog
          title="Sair do treino?"
          message="O progresso desta sessão não será salvo. Os exercícios já registrados serão descartados."
          confirmLabel="Sair sem salvar"
          danger
          onConfirm={confirmExit}
          onCancel={() => setShowExit(false)}
        />
      )}
    </div>
  );
}
