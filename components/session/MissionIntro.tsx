"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import { getWorkoutCampaign } from "@/lib/db/queries/campaign";
import {
  formTip,
  remainingSessions,
  shortSkillName,
  stakeLine,
  statusLabel,
} from "@/lib/domain/campaign";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { focusLabel, workoutFocus } from "@/lib/domain/workoutFocus";
import { getLastWorkoutRun } from "@/lib/db/queries/previousWorkout";
import { countCompletedSessions } from "@/lib/db/queries/metrics";
import { focusEntries } from "@/lib/plan/focus";
import { relativeDay } from "@/lib/utils/date";
import { exerciseSkillMapping, getLevelFlags } from "@/lib/plan/skills";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";
import { FlagIcon } from "@/components/ui/icons";
import { accentVars } from "@/components/ui/accent";
import { SkillLadder } from "./SkillLadder";
import { StreakBar } from "./StreakBar";
import { RPE_LABELS } from "./RpeSheet";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const LEAVE_MS = 280;

/** Dica de forma quando nenhum objetivo entra no treino: a do 1º exercício de skill. */
function workoutTip(workout: Workout): string | null {
  for (const block of workout.blocks) {
    for (const ex of block.exercises) {
      const m = exerciseSkillMapping(ex.id);
      if (m) return formTip(getLevelFlags(m.skill_id, m.level));
    }
  }
  return null;
}

/**
 * Tela de carregamento ao começar um treino: o treino, o objetivo que ele move
 * (com a escada e o que está em jogo hoje) e uma dica de forma. Abre num
 * círculo a partir do botão e fecha com um toque em qualquer lugar; a sessão já
 * está criada por baixo. Só aparece ao começar, nunca ao retomar: a retomada
 * tem que ser instantânea.
 *
 * Tela cheia como o resumo do treino: Dialog e Sheet não servem, e a casca do
 * ModalShell escurece e esmaece o fundo junto com a entrada.
 */
export function MissionIntro({
  workout,
  origin,
  onClose,
}: {
  workout: Workout;
  /** Centro do botão que começou o treino, em px da janela. */
  origin: { x: number; y: number };
  onClose: () => void;
}) {
  const titleId = useId();
  const factor = useDurationFactor();
  // Só monta depois de um toque: ler o localStorage aqui não afeta a hidratação.
  const [goals] = useState(getAiGoals);
  const items = useLiveQuery(() => getWorkoutCampaign(workout, goals), [workout, goals]);
  // null = primeira vez neste treino; undefined = carregando
  const last = useLiveQuery(async () => (await getLastWorkoutRun(workout.id)) ?? null, [workout.id]);
  // No primeiro treino o aviso de objetivo atrapalha: a pessoa acabou de responder
  // o onboarding, e "Sem objetivo marcado" soa como se o app não tivesse ouvido.
  const completed = useLiveQuery(() => countCompletedSessions(), []);
  const showNoGoal = goals.length === 0 && completed !== undefined && completed > 0;
  const [leaving, setLeaving] = useState(false);
  const ref = useModalA11y<HTMLDivElement>(() => setLeaving(true));

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(onClose, LEAVE_MS);
    return () => window.clearTimeout(id);
  }, [leaving, onClose]);

  const exercises = workout.blocks.reduce((n, b) => n + b.exercises.length, 0);
  const primary = items?.[0];
  const rest = items?.slice(1) ?? [];
  const tip = primary ? formTip(primary.flags) : workoutTip(workout);
  // Sem objetivo em jogo, a tela ficava só com o título: entra o foco do treino
  // e como foi a última vez, que a lista de exercícios não diz.
  const offGoal = items !== undefined && !primary;
  const focus = offGoal ? workoutFocus(focusEntries(workout)) : null;
  const lastTiles = last
    ? [
        last.minutes !== null && { value: last.minutes, label: last.minutes === 1 ? "minuto" : "minutos" },
        last.reps !== null && { value: last.reps, label: "reps" },
        last.rpe !== null && {
          value: last.rpe,
          label: RPE_LABELS.find((r) => r.v === last.rpe)?.label ?? "esforço",
        },
      ].filter((t): t is { value: number; label: string } => Boolean(t))
    : [];
  const offAt = showNoGoal ? 350 : 250;

  return (
    <Portal>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={() => setLeaving(true)}
        className={`mission-screen fixed inset-0 z-50 overflow-y-auto outline-none ${leaving ? "anim-leave" : "anim-reveal"}`}
        style={
          {
            ...accentVars(workout.accent),
            "--x": `${origin.x}px`,
            "--y": `${origin.y}px`,
          } as CSSProperties
        }
      >
        <div
          className="mx-auto flex min-h-full max-w-md flex-col gap-[18px] px-5"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 2.25rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          }}
        >
          <header className="anim-rise" style={at(150)}>
            <p className="eyebrow-lg">Hoje · Treino {workout.label}</p>
            <h1 id={titleId} className="display mt-1.5 text-display leading-none">
              {workout.title}
            </h1>
            <p className="mt-1.5 font-mono text-xs text-muted">
              {durationLabel(workout, factor)} · {exercises} exercícios
            </p>
          </header>

          {showNoGoal && (
            <p className="card anim-rise px-4 py-3.5 text-sm leading-snug text-muted" style={at(250)}>
              <span className="font-medium text-text">Sem objetivo marcado.</span> Em Treino →
              Meus objetivos você escolhe uma skill, e cada treino passa a mostrar o quanto ela
              anda.
            </p>
          )}

          {offGoal && focus && (
            <div className="anim-rise flex flex-col gap-1" style={at(offAt)}>
              <p className="eyebrow">Foco do treino</p>
              <p className="display text-display-sm leading-tight">{focusLabel(focus)}</p>
            </div>
          )}

          {offGoal && last && lastTiles.length > 0 && (
            <section aria-label="Última vez" className="anim-rise flex flex-col gap-2" style={at(offAt + 150)}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="eyebrow">Última vez · Treino {workout.label}</p>
                <span className="shrink-0 font-mono text-xs text-muted">{relativeDay(last.date)}</span>
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${lastTiles.length}, minmax(0, 1fr))` }}
              >
                {lastTiles.map((tile) => (
                  <div key={tile.label} className="card px-3 py-2.5">
                    <p className="display text-display-sm leading-none">{tile.value}</p>
                    <p className="mt-1 font-mono text-2xs text-muted">{tile.label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {primary && (
            <section
              aria-label="Objetivo"
              className="glow anim-rise flex flex-col gap-3.5 rounded-card bg-surface p-4"
              style={at(250)}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="eyebrow">Objetivo</p>
                  <h2 className="display truncate text-display-sm leading-tight">
                    {shortSkillName(primary.skillName)}
                  </h2>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted">
                  nível {primary.level} de {primary.ladder.length}
                </span>
              </div>
              <SkillLadder names={primary.ladder} level={primary.level} delay={450} />
              <div className="anim-rise" style={at(1050)}>
                <p className="eyebrow mb-1">
                  Nível {primary.level} · {primary.ladder[primary.level - 1]}
                </p>
                {primary.criteria && <p className="text-sm leading-snug">{primary.criteria}</p>}
              </div>
              <p className="anim-rise text-sm font-medium leading-snug text-ac" style={at(1250)}>
                {stakeLine(primary)}
              </p>
              <div
                className="anim-rise flex items-center gap-3 border-t border-border pt-3"
                style={at(1400)}
              >
                <FlagIcon className="h-4 w-4 shrink-0 text-ac" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{primary.exerciseName}</span>
                  <span className="tnum text-xs text-muted">{primary.target} · é o que conta</span>
                </span>
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section className="anim-rise flex flex-col gap-2" style={at(1550)}>
              <p className="eyebrow">Também avança hoje</p>
              <ul className="card">
                {rest.map((it, i) => (
                  <li
                    key={it.skillId}
                    className={`flex items-center gap-3 px-3.5 py-3 ${i > 0 ? "border-t border-border" : ""}`}
                  >
                    <StreakBar total={it.required} filled={Math.min(it.streak, it.required)} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        <span className="font-semibold">{shortSkillName(it.skillName)}</span> · nível {it.level} de{" "}
                        {it.ladder.length}
                      </span>
                      <span className="block truncate font-mono text-xs text-muted">
                        {it.exerciseName} · {it.target}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 font-mono text-xs ${remainingSessions(it) <= 1 ? "text-ac" : "text-muted"}`}
                    >
                      {statusLabel(it)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex-1" />

          {tip && (
            <div className="anim-rise flex flex-col gap-1" style={at(rest.length ? 1700 : 1600)}>
              <p className="eyebrow">Dica</p>
              <p className="text-sm leading-snug">{tip}</p>
            </div>
          )}
          <div className="load-bar h-1 shrink-0 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
            <div className="load-fill h-full bg-ac" />
          </div>
          <p className="anim-press text-center font-mono text-2xs uppercase tracking-[0.14em] text-muted">
            toque pra começar
          </p>
        </div>
      </div>
    </Portal>
  );
}
