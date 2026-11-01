"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { EffortFace, RPE_LABELS } from "@/components/session/RpeSheet";
import { accentVars, DEFAULT_ACCENT } from "@/components/ui/accent";

/**
 * Um treino inteiro numa caixa, ao lado de "um toque por série": o cartão de
 * começar da home, os exercícios ("Fiz como previsto" ou ajustar série a série),
 * a pergunta de esforço, a tela de concluído e a volta ao começo. Morava na
 * abertura, só com os exercícios, e saiu de lá porque poluía o primeiro olhar.
 *
 * Usa as mesmas peças do app (botão que pulsa, chips de série, contador,
 * carinhas de esforço) pra demo não mostrar um app que não existe. Ficam de fora
 * a tela de abertura do treino e o descanso, pra caber numa caixa.
 *
 * Conteúdo fixo de propósito: nada aqui sai de `plan.json`, que vem do
 * localStorage e quebraria a hidratação desta página estática (regra 10).
 */

const WORKOUT = { label: "A", title: "Barra + Paralelas", minutes: 24 };

const EXERCISES = [
  { name: "Muscle-up negativa", sets: [3, 3, 3], last: "3, 3, 2" },
  { name: "Pull-up", sets: [8, 8, 8, 8], last: "8, 8, 7, 6" },
  { name: "Dip nas paralelas", sets: [10, 10, 10], last: "10, 10, 8" },
] as const;

type Step = "home" | "run" | "rate" | "done";

interface Logged {
  reps: number[];
  adjusted: boolean;
}

const CAPTION: Record<Step, string> = {
  home: "Toque e veja um treino do começo ao fim.",
  run: "É assim que você registra, entre uma série e outra.",
  rate: "É assim que você registra, entre uma série e outra.",
  done: "Isso é um treino registrado.",
};

const target = (sets: readonly number[]) => `${sets.length} × ${sets[0]}`;

export function OneTapDemo() {
  const [step, setStep] = useState<Step>("home");
  const [showList, setShowList] = useState(false);
  const [logs, setLogs] = useState<Logged[]>([]);
  // Séries em ajuste do exercício atual; `null` = cartão com os dois botões.
  const [editing, setEditing] = useState<number[] | null>(null);
  const [cur, setCur] = useState(0);
  const [rpe, setRpe] = useState<number | null>(null);

  // A cada passo o botão tocado some; o foco vai pro passo novo em vez de cair
  // no body. Não no primeiro render: roubaria o foco de quem chega na página.
  const stepRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    stepRef.current?.focus({ preventScroll: true });
  }, [step]);

  const done = logs.length;
  const allDone = done >= EXERCISES.length;
  const pending = EXERCISES.length - done;

  function log(reps: number[]) {
    const planned = EXERCISES[done].sets;
    setLogs((l) => [...l, { reps, adjusted: reps.some((v, i) => v !== planned[i]) }]);
    setEditing(null);
  }

  function restart() {
    setLogs([]);
    setEditing(null);
    setRpe(null);
    setShowList(false);
    setStep("home");
  }

  function nudge(delta: number) {
    setEditing((e) => e && e.map((v, i) => (i === cur ? Math.max(0, v + delta) : v)));
  }

  return (
    <div style={accentVars(DEFAULT_ACCENT)}>
      <div
        role="group"
        aria-label="Demonstração: um treino do começo ao fim"
        className="relative flex flex-col lg:min-h-108 lg:justify-center"
      >
        {step === "home" && (
          <div ref={stepRef} tabIndex={-1} className="anim-fade-in-up glow rounded-card bg-ac-bg p-5 outline-none">
            <div className="flex items-center gap-2">
              <span className="letter-chip rounded-full bg-ac px-2 py-0.5 font-mono text-xs text-on-accent">
                {WORKOUT.label}
              </span>
              <span className="font-mono text-xs text-muted">~25min</span>
              <span className="font-mono text-xs text-muted">· {EXERCISES.length} exercícios</span>
            </div>
            <h3 className="display mt-2 text-3xl leading-tight">{WORKOUT.title}</h3>
            <p className="mt-1 text-sm text-muted">O treino de hoje.</p>
            <button
              type="button"
              onClick={() => setStep("run")}
              className="btn-primary anim-ring tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-center font-semibold"
            >
              Começar treino
            </button>
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              aria-expanded={showList}
              className="tap mt-2 flex w-full items-center justify-center gap-1 py-2 text-sm text-muted"
            >
              {showList ? "Ocultar exercícios" : "Ver exercícios"}
              <ChevronDownIcon className={`h-4 w-4 transition-transform ${showList ? "rotate-180" : ""}`} />
            </button>
            {showList && (
              <ul className="anim-fade-in mt-1 flex flex-col gap-1">
                {EXERCISES.map((ex) => (
                  <li key={ex.name} className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
                    <span className="truncate font-medium">{ex.name}</span>
                    <span className="tnum shrink-0 text-xs text-muted">{target(ex.sets)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(step === "run" || step === "rate") && (
          <div
            ref={step === "run" ? stepRef : undefined}
            tabIndex={-1}
            inert={step === "rate"}
            className="anim-fade-in-up flex flex-col gap-2 outline-none"
          >
            <div className="mb-1 flex items-center gap-3">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full bg-ac transition-[width] duration-500"
                  style={{ width: `${(done / EXERCISES.length) * 100}%` }}
                />
              </div>
              <span className="tnum text-2xs text-muted">
                {done}/{EXERCISES.length}
              </span>
            </div>

            {EXERCISES.map((ex, i) => {
              if (i < done) {
                return (
                  <div
                    key={ex.name}
                    className="flex items-center justify-between gap-3 rounded-card border border-ac/50 bg-surface px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="display truncate text-lg leading-tight">{ex.name}</p>
                      <p className="tnum text-xs text-muted">
                        {logs[i].reps.join(", ")} · {logs[i].adjusted ? "ajustado" : "como previsto"}
                      </p>
                    </div>
                    <span
                      className="anim-pop flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ac text-on-accent"
                      aria-label="concluído"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  </div>
                );
              }

              if (i > done) {
                return (
                  <div key={ex.name} className="card flex items-center justify-between gap-3 px-4 py-3">
                    <p className="display truncate text-lg leading-tight text-muted">{ex.name}</p>
                    <span className="tnum shrink-0 text-xs text-muted">{target(ex.sets)}</span>
                  </div>
                );
              }

              return (
                <div key={ex.name} className="anim-fade-in-up rounded-card border border-ac bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="display truncate text-2xl leading-tight text-ac">{ex.name}</h3>
                    <span className="tnum shrink-0 text-sm text-muted">{target(ex.sets)}</span>
                  </div>
                  <p className="tnum mt-0.5 text-xs text-muted">última: {ex.last}</p>

                  {editing ? (
                    <>
                      <div role="group" aria-label="Séries" className="mt-4 flex flex-wrap gap-2">
                        {editing.map((v, k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setCur(k)}
                            aria-pressed={k === cur}
                            aria-label={`Série ${k + 1}: ${v}`}
                            className={`set-chip tnum flex h-11 min-w-11 items-center justify-center rounded-[10px] px-2 font-mono text-sm ${
                              k === cur ? "border border-ac/60 bg-surface2 text-text" : "border border-border text-muted"
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-[4rem_1fr_4rem] items-center gap-2">
                        <button
                          type="button"
                          aria-label="Menos um"
                          onClick={() => nudge(-1)}
                          className="btn-key flex h-16 items-center justify-center rounded-2xl text-text"
                        >
                          <MinusIcon className="h-6 w-6" />
                        </button>
                        <div className="flex flex-col items-center" aria-live="polite">
                          <span className="display h-[4.5rem] overflow-hidden text-display-xl leading-none">
                            <RollingNumber value={editing[cur]} />
                          </span>
                          <span className="mt-1 font-mono text-2xs text-muted">repetições · série {cur + 1}</span>
                        </div>
                        <button
                          type="button"
                          aria-label="Mais um"
                          onClick={() => nudge(1)}
                          className="btn-key flex h-16 items-center justify-center rounded-2xl text-text"
                        >
                          <PlusIcon className="h-6 w-6" />
                        </button>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => log(editing)}
                          className="btn-primary tap flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium"
                        >
                          <CheckIcon className="h-5 w-5" />
                          Registrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="btn-secondary tap rounded-xl px-4 font-medium"
                        >
                          Voltar
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => log([...ex.sets])}
                        className="btn-primary tap flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-medium"
                      >
                        <CheckIcon className="h-5 w-5" />
                        Fiz como previsto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing([...ex.sets]);
                          setCur(0);
                        }}
                        className="btn-secondary tap rounded-xl px-4 font-medium"
                      >
                        Ajustar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setStep("rate");
              }}
              className={`tap mt-1 w-full rounded-xl py-3 font-semibold ${allDone ? "btn-primary" : "btn-secondary"}`}
            >
              Finalizar treino
            </button>
          </div>
        )}

        {/* A pergunta de esforço do RpeSheet, presa à caixa da demo: um Sheet de
            verdade cobriria a landing inteira por causa de uma demonstração. */}
        {step === "rate" && (
          <div className="anim-fade-in absolute -inset-2 flex items-end overflow-hidden rounded-card bg-bg/60 backdrop-blur-sm">
            <div
              ref={stepRef}
              tabIndex={-1}
              role="group"
              aria-label="Como foi a sessão?"
              className="anim-slide-up w-full rounded-t-2xl border-t border-border bg-surface2 p-4 outline-none"
            >
              <p className="text-lg font-semibold">Como foi a sessão?</p>
              {pending > 0 && (
                <p className="mt-1 text-sm text-muted">
                  {pending} {pending === 1 ? "exercício não marcado fica" : "exercícios não marcados ficam"} sem
                  registro.
                </p>
              )}
              <div className="mt-4 grid grid-cols-5 gap-2">
                {RPE_LABELS.map(({ v, label }) => {
                  const on = rpe === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRpe(v)}
                      aria-pressed={on}
                      aria-label={`Esforço ${v}, ${label}`}
                      className={`tap flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 transition-colors duration-200 ${
                        on ? "border-ac bg-ac text-on-accent" : "border-border text-text"
                      }`}
                    >
                      <EffortFace level={v} className="h-6 w-6" />
                      <span className="tnum text-xs font-semibold">{v}</span>
                      <span className="text-3xs leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("run")}
                  className="btn-neutral tap rounded-xl px-4 py-3 font-medium text-muted"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => setStep("done")}
                  disabled={rpe === null}
                  className="btn-primary tap flex-1 rounded-xl py-3 font-medium transition-opacity disabled:opacity-40"
                >
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "done" && (
          <div ref={stepRef} tabIndex={-1} className="anim-fade-in-up outline-none">
            <p className="eyebrow">
              Treino {WORKOUT.label} · {WORKOUT.title}
            </p>
            <h3 className="mt-1 flex items-center gap-2.5">
              <span className="anim-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ac text-on-accent">
                <CheckIcon className="h-5 w-5" />
              </span>
              <span className="display-caps text-3xl">Treino concluído</span>
            </h3>
            <div className="card mt-4 flex flex-col p-4">
              <span className="display text-display-xl leading-none text-ac">{WORKOUT.minutes}</span>
              <span className="mt-1 font-mono text-xs text-muted">minutos de treino</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="card flex flex-col p-4">
                <span className="display text-3xl leading-none">
                  {done}
                  <span className="text-lg text-muted">/{EXERCISES.length}</span>
                </span>
                <span className="mt-1 font-mono text-xs text-muted">exercícios</span>
              </div>
              <div className="card flex flex-col p-4">
                <span className="display text-3xl leading-none">
                  {logs.reduce((n, l) => n + l.reps.length, 0)}
                </span>
                <span className="mt-1 font-mono text-xs text-muted">séries</span>
              </div>
            </div>
            <button
              type="button"
              onClick={restart}
              className="btn-primary tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 font-semibold"
            >
              Voltar pro início
            </button>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-xs text-muted">{CAPTION[step]}</p>
    </div>
  );
}
