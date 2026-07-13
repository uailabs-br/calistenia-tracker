"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { PlanDay } from "@/lib/plan/schema";
import type { Session, ExerciseLog } from "@/lib/db/schema";
import { getLogsForSession, upsertLog } from "@/lib/db/repositories/logs";
import { completeSession, discardSession } from "@/lib/db/repositories/sessions";
import { useWakeLock } from "@/lib/utils/useWakeLock";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExerciseCard, type RecordInput } from "./ExerciseCard";
import { RpeSheet } from "./RpeSheet";

export function SessionRunner({
  session,
  day,
  onFinished,
}: {
  session: Session;
  day: PlanDay;
  onFinished: () => void;
}) {
  useWakeLock(true);

  const flat = useMemo(
    () =>
      day.blocks.flatMap((block) =>
        block.exercises.map((exercise) => ({
          exercise,
          isSkill: block.is_skill,
          blockLabel: block.label,
        }))
      ),
    [day]
  );

  const logs = useLiveQuery(
    () => getLogsForSession(session.id),
    [session.id]
  );
  const logByExercise = useMemo(() => {
    const m = new Map<string, ExerciseLog>();
    (logs ?? []).forEach((l) => m.set(l.exercise_id, l));
    return m;
  }, [logs]);

  // Índice ativo: primeiro exercício sem log (retomada vem do banco)
  const firstUnlogged = flat.findIndex((f) => !logByExercise.has(f.exercise.id));
  const [manualActive, setManualActive] = useState<number | null>(null);
  const activeIndex =
    manualActive !== null ? manualActive : firstUnlogged === -1 ? -1 : firstUnlogged;

  const [showRpe, setShowRpe] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const pending = flat.filter((f) => !logByExercise.has(f.exercise.id)).length;

  const handleRecord = async (exerciseId: string, input: RecordInput) => {
    await upsertLog({ session_id: session.id, exercise_id: exerciseId, ...input });
    // avança para o próximo sem log
    const idx = flat.findIndex((f) => f.exercise.id === exerciseId);
    const nextUnlogged = flat.findIndex(
      (f, i) =>
        i > idx &&
        !logByExercise.has(f.exercise.id) &&
        f.exercise.id !== exerciseId
    );
    setManualActive(nextUnlogged === -1 ? -1 : nextUnlogged);
  };

  const handleFinalize = () => setShowRpe(true);

  const confirmFinalize = async (rpe: number, note: string) => {
    await completeSession(session.id, rpe, note);
    onFinished();
  };

  const confirmExit = async () => {
    await discardSession(session.id);
    setShowExit(false);
    onFinished();
  };

  let lastBlock = "";

  return (
    <div className="anim-fade-in px-4">
      <div className="flex flex-col gap-2">
        {flat.map((item, i) => {
          const showBlock = item.blockLabel !== lastBlock;
          lastBlock = item.blockLabel;
          return (
            <div key={item.exercise.id}>
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
                active={i === activeIndex}
                onActivate={() => setManualActive(i)}
                onRecord={(input) => handleRecord(item.exercise.id, input)}
              />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleFinalize}
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

      {showRpe && (
        <RpeSheet
          accent={day.accent}
          pendingCount={pending}
          onConfirm={confirmFinalize}
          onCancel={() => setShowRpe(false)}
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
