"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import type { Session, ExerciseLog } from "@/lib/db/schema";
import {
  addExtraSet,
  getLogsForSession,
  setExtraSets,
  upsertLog,
  removeLog,
} from "@/lib/db/repositories/logs";
import {
  addExerciseToSession,
  completeSession,
  discardSession,
  removeAddedExercise,
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
import { snapshotOf } from "@/lib/plan/resolve";
import { extraSeed, extraSets, totalVolume } from "@/lib/domain/volume";
import { computePR, formatPR, type PRResult } from "@/lib/db/queries/pr";
import { useWakeLock } from "@/lib/utils/useWakeLock";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlusIcon } from "@/components/ui/icons";
import { ExerciseCard, type RecordInput } from "./ExerciseCard";
import { AddExerciseSheet } from "./AddExerciseSheet";
import { RpeSheet } from "./RpeSheet";
import { RestTimer } from "./RestTimer";
import { SessionSummary } from "./SessionSummary";
import { CollapsibleTip } from "./CollapsibleTip";
import { WarmupCard } from "./WarmupCard";
import { ProgressionNudge } from "./ProgressionNudge";

export function SessionRunner({
  session,
  day,
  onCompleted,
  onFinished,
  initialExerciseId,
}: {
  session: Session;
  day: PlanDay;
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
      day.blocks.flatMap((block) =>
        block.exercises.map((exercise) => ({
          exercise,
          isSkill: block.is_skill,
          blockLabel: block.label,
          added: false,
        }))
      ),
    [day]
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

  // Índice ativo: primeiro exercício sem log (retomada vem do banco)
  const firstUnlogged = flat.findIndex((f) => !logByExercise.has(f.exercise.id));
  const [manualActive, setManualActive] = useState<number | null>(null);
  const activeIndex =
    manualActive !== null ? manualActive : firstUnlogged === -1 ? -1 : firstUnlogged;

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
  // Descanso manual entre séries, disparado pelo card ativo.
  const startRest = (seconds: number) => setRest({ seconds, key: Date.now() });

  const pending = flat.filter((f) => !logByExercise.has(f.exercise.id)).length;
  const doneCount = flat.length - pending;
  const progressPct = flat.length > 0 ? (doneCount / flat.length) * 100 : 0;
  // Reps totais da sessão — só exercícios em unidade "reps" (holds/tentativas
  // não somam no mesmo número, misturaria unidades diferentes).
  const repsVolume = flat.reduce((sum, item) => {
    const log = logByExercise.get(item.exercise.id);
    if (!log || log.skipped || item.exercise.parsed?.unit !== "reps") return sum;
    return sum + totalVolume(log, item.exercise.parsed);
  }, 0);

  // Séries extras da sessão (para o fechamento do treino).
  const extraSetsCount = (logs ?? []).reduce((n, l) => n + extraSets(l).length, 0);

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

  const undoRecord = async (exerciseId: string, prev: ExerciseLog | undefined) => {
    try {
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
      setPrResults((prev) => {
        if (!prev.has(exerciseId)) return prev;
        const next = new Map(prev);
        next.delete(exerciseId);
        return next;
      });
      const idx = flat.findIndex((f) => f.exercise.id === exerciseId);
      if (idx !== -1) setManualActive(idx);
    } catch {
      toast({ message: "Não foi possível desfazer.", variant: "error" });
    }
  };

  // Alvo/nome do exercício NESTE momento, gravado no log (ver ExerciseSnapshot).
  const snapshotFor = (exerciseId: string) => {
    const ex = flat.find((f) => f.exercise.id === exerciseId)?.exercise;
    return ex ? snapshotOf(ex) : null;
  };

  // Ação de registro: persiste, avança, oferece undo e inicia o descanso.
  const handleRecord = async (exerciseId: string, input: RecordInput) => {
    const prev = logByExercise.get(exerciseId);
    try {
      await upsertLog({
        session_id: session.id,
        exercise_id: exerciseId,
        snapshot: snapshotFor(exerciseId),
        ...input,
      });
    } catch {
      toast({
        message: "Não foi possível registrar. Tente de novo.",
        variant: "error",
      });
      return;
    }

    advanceFrom(exerciseId);

    const item = flat.find((f) => f.exercise.id === exerciseId);
    let pr: Awaited<ReturnType<typeof computePR>> = null;
    if (!input.skipped) {
      try {
        pr = await computePR(exerciseId, input, item?.exercise.parsed ?? null);
      } catch {
        /* PR é enfeite: nunca bloqueia o registro */
      }
    }

    if (pr) setPrResults((m) => new Map(m).set(exerciseId, pr));

    toast({
      message: pr
        ? `🏆 Novo recorde — ${formatPR(pr)} de ${item?.exercise.name ?? ""}`
        : input.skipped
          ? "Exercício pulado"
          : "Registrado",
      variant: pr ? "success" : undefined,
      // PR fica mais tempo na tela — mensagem mais longa, lida ofegante no meio do treino.
      duration: pr ? 6500 : undefined,
      action: { label: "Desfazer", onClick: () => undoRecord(exerciseId, prev) },
    });

    // Descanso automático (não para exercícios pulados)
    if (!input.skipped) {
      const secs = parseRestSeconds(
        flat.find((f) => f.exercise.id === exerciseId)?.exercise.rest ?? ""
      );
      if (secs) setRest({ seconds: secs, key: Date.now() });
      else setRest(null);
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
    const item = flat.find((f) => f.exercise.id === exerciseId);
    if (!log || log.skipped || !item) return;
    const { parsed, target, rest: restText, name } = item.exercise;
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
    let pr: PRResult | null = null;
    try {
      pr = await computePR(
        exerciseId,
        {
          as_target: false,
          sets: [{ index: 0, value }],
          skipped: false,
          flags_selected: log.flags_selected,
        },
        parsed
      );
    } catch {
      /* PR é enfeite: nunca bloqueia o registro */
    }
    if (pr && prPrev && pr.value <= prPrev.value) pr = null;
    if (pr) setPrResults((m) => new Map(m).set(exerciseId, pr as PRResult));

    toast({
      message: pr
        ? `🏆 Novo recorde — ${formatPR(pr)} de ${name}`
        : `Série extra: ${formatValue(value, parsed)}`,
      variant: pr ? "success" : undefined,
      duration: pr ? 6500 : undefined,
      action: {
        label: "Desfazer",
        onClick: async () => {
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
        },
      },
    });

    const secs = parseRestSeconds(restText);
    if (secs) setRest({ seconds: secs, key: Date.now() });
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
      await completeSession(session.id, rpe, note);
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
    <div className="anim-fade-in px-4">
      {/* Barra de progresso da sessão */}
      <div className="sticky top-0 z-20 -mx-4 mb-2 bg-bg/85 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progressPct}%`, background: day.accent }}
            />
          </div>
          <span className="tnum shrink-0 text-xs text-muted">
            {doneCount}/{flat.length}
          </span>
        </div>
      </div>

      {/* Título → progresso (acima) → por que → aquecimento → exercícios */}
      <CollapsibleTip tip={day.tip} accent={day.accent} />
      {day.warmup && (
        <div className="mb-3 mt-3">
          <WarmupCard
            warmup={day.warmup}
            accent={day.accent}
            accentBg={day.accent_bg}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {flat.map((item, i) => {
          const showBlock = item.blockLabel !== lastBlock;
          lastBlock = item.blockLabel;
          return (
            <div key={item.exercise.id} id={`ex-${item.exercise.id}`}>
              {showBlock && (
                <p className="mb-1 mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                  {item.blockLabel}
                </p>
              )}
              <ExerciseCard
                exercise={item.exercise}
                isSkill={item.isSkill}
                accent={day.accent}
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
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium active:scale-[0.99]"
        style={{ borderColor: day.accent, color: day.accent }}
      >
        <PlusIcon className="h-4 w-4" />
        Adicionar exercício
      </button>

      {pending === 0 && <ProgressionNudge day={day} accent={day.accent} />}

      <button
        type="button"
        onClick={() => setShowRpe(true)}
        className="tap mt-6 w-full rounded-xl border py-3 font-medium"
        style={{ borderColor: day.accent, color: day.accent }}
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

      {rest && (
        <RestTimer
          key={rest.key}
          seconds={rest.seconds}
          accent={day.accent}
          onDone={() => setRest(null)}
        />
      )}

      {showAdd && (
        <AddExerciseSheet
          accent={day.accent}
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
          accent={day.accent}
          pendingCount={pending}
          onConfirm={confirmFinalize}
          onCancel={() => setShowRpe(false)}
        />
      )}

      {showSummary && (
        <SessionSummary
          accent={day.accent}
          seed={session.id}
          exercisesDone={doneCount}
          repsVolume={repsVolume}
          extraSets={extraSetsCount}
          prs={Array.from(prResults.entries()).map(([id, pr]) => ({
            id,
            name: flat.find((f) => f.exercise.id === id)?.exercise.name ?? id,
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
