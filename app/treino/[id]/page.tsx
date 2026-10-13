"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Session } from "@/lib/db/schema";
import { getWorkoutById, plan } from "@/lib/plan/loader";
import { usePlanReady } from "@/lib/utils/usePlanReady";
import { skillIdForWorkout } from "@/lib/plan/skills";
import { queueFrom } from "@/lib/domain/nextWorkout";
import {
  getActiveSession,
  createSession,
  getLastPlanWorkoutId,
} from "@/lib/db/repositories/sessions";
import { localDateKey } from "@/lib/utils/date";
import { WorkoutHeader } from "@/components/session/WorkoutHeader";
import { WorkoutPills } from "@/components/session/WorkoutPills";
import { SessionRunner } from "@/components/session/SessionRunner";
import { CollapsibleTip } from "@/components/session/CollapsibleTip";
import { getExerciseMedia } from "@/lib/plan/media";
import { WarmupCard } from "@/components/session/WarmupCard";
import { ChevronRightIcon } from "@/components/ui/icons";

export default function TreinoPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const urlId = decodeURIComponent(params.id);
  const todayKey = localDateKey();
  const initialEx = search.get("ex") ?? undefined;

  // Treino pela URL; se o id não existe no plano (link antigo, plano trocado),
  // cai no primeiro do plano.
  const [selected, setSelected] = useState<string>(() =>
    getWorkoutById(urlId) ? urlId : plan.workouts[0].id
  );
  const workout = getWorkoutById(selected)!;
  const planReady = usePlanReady();

  const [starting, setStarting] = useState(false);
  // null = carregado sem sessão; undefined = ainda carregando (distinção importa
  // para o auto-start do deep-link não disparar antes da hora).
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);

  // Próximo da sequência: só pra marcar na seleção. Não obriga a fazer esse.
  const lastPlanId = useLiveQuery(() => getLastPlanWorkoutId(), []);
  const nextId =
    lastPlanId === undefined ? null : (queueFrom(lastPlanId, plan.workouts)[0]?.id ?? null);

  // completeSession() tira a sessão de "in_progress" e `active` cai pra null —
  // mas a tela de resumo ainda precisa do runner montado. `finishing` segura o
  // render até o usuário fechar o resumo; o ref guarda a última sessão ativa
  // pra não perder session/workout nesse meio-tempo.
  const [finishing, setFinishing] = useState(false);
  const lastActiveRef = useRef<Session | null>(null);
  if (active) lastActiveRef.current = active;

  useEffect(() => {
    if (active === null) setStarting(false);
  }, [active]);

  const completedForSelected = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return rows.find(
      (s) =>
        s.status === "completed" &&
        !s.deleted_at &&
        s.source === "plan" &&
        s.workout_id === selected
    );
  }, [todayKey, selected]);

  const start = async () => {
    setStarting(true);
    await createSession(selected);
  };

  // Deep-link ?ex=: sem sessão ativa e sem já ter concluído hoje, inicia direto.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!initialEx || autoStarted.current) return;
    if (active === undefined) return; // ainda carregando
    if (active || completedForSelected) return; // já há sessão/registro
    autoStarted.current = true;
    setStarting(true);
    createSession(selected);
  }, [initialEx, active, completedForSelected, selected]);

  // Sessão em andamento (ou acabou de finalizar e mostra o resumo) → runner
  // do treino da PRÓPRIA sessão.
  if (active || finishing) {
    const session = active ?? lastActiveRef.current!;
    const activeWorkout =
      (session.workout_id && getWorkoutById(session.workout_id)) || workout;
    return (
      <div style={{ ["--ac" as string]: activeWorkout.accent }}>
        <div className="px-4">
          <WorkoutHeader workout={activeWorkout} />
        </div>
        <SessionRunner
          session={session}
          workout={activeWorkout}
          initialExerciseId={initialEx}
          onCompleted={() => setFinishing(true)}
          onFinished={() => {
            setFinishing(false);
            router.push("/");
          }}
        />
      </div>
    );
  }

  // Sem isto, o HTML estático traz o treino do plano embutido e o cliente, o do
  // override: a hidratação falha e a tela inteira é repintada.
  if (!planReady) return <div className="px-4 pt-6" aria-busy="true" />;

  return (
    <div className="px-4">
      <div className="pt-6">
        <WorkoutPills selectedId={selected} nextId={nextId} onSelect={setSelected} />
      </div>

      <WorkoutHeader workout={workout} />

      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="tap w-full rounded-xl py-3.5 text-center font-semibold shadow-lg transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{ background: workout.accent, color: "var(--color-on-accent)" }}
      >
        {starting
          ? "Abrindo…"
          : completedForSelected
            ? "Treinar de novo"
            : `Começar · ${workout.title}`}
      </button>

      {completedForSelected && (
        <div
          className="mb-4 mt-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: workout.accent, color: workout.accent }}
        >
          Esse treino já foi registrado hoje. Começar de novo cria uma nova sessão.
        </div>
      )}

      {skillIdForWorkout(workout.skill) && (
        <Link
          href={`/skills/${skillIdForWorkout(workout.skill)}`}
          className="tap mt-3 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
        >
          <span className="text-sm font-medium">Progressão · {workout.skill}</span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      )}

      {/* título → começar → por que → aquecimento → exercícios */}
      <CollapsibleTip tip={workout.tip} accent={workout.accent} />
      {workout.warmup && (
        <div className="mt-3">
          <WarmupCard
            warmup={workout.warmup}
            accent={workout.accent}
            accentBg={workout.accent_bg}
          />
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-2">
        {workout.blocks.map((block) => (
          <li key={block.label}>
            <p className="mb-1 mt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              {block.label}
            </p>
            <ul className="flex flex-col gap-2">
              {block.exercises.map((ex) => (
                <li
                  key={ex.id}
                  className="rounded-card border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="font-medium"
                      style={block.is_skill ? { color: workout.accent } : undefined}
                    >
                      {ex.name}
                    </span>
                    <span className="tnum shrink-0 text-sm text-muted">
                      {ex.target}
                    </span>
                  </div>
                  <CollapsibleTip
                    tip={ex.obs}
                    accent={workout.accent}
                    label="como executar"
                    media={getExerciseMedia(ex.id)}
                    mediaName={ex.name}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="h-8" />
    </div>
  );
}
