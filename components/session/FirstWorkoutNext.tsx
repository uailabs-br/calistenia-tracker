"use client";

import { useEffect, useId, useState } from "react";
import type { Workout } from "@/lib/plan/schema";
import { buildIcs, suggestedGap } from "@/lib/domain/calendar";
import { estimateDurationSeconds } from "@/lib/domain/estimateDuration";
import { downloadIcs } from "@/lib/utils/calendarFile";
import { localDateKey, shiftDays } from "@/lib/utils/date";
import { uuid } from "@/lib/utils/id";
import { getDeferredInstall, isIOS, isStandalone, promptInstall } from "@/lib/utils/installPrompt";
import { setNextSession } from "@/lib/utils/nextSession";
import { getWeekGoal } from "@/lib/utils/profile";
import { useModalA11y } from "@/lib/utils/useModalA11y";
import { Portal } from "@/components/ui/Portal";
import { accentVars } from "@/components/ui/accent";

const WEEKDAY = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TIMES = [
  { time: "07:00", label: "Manhã · 7h" },
  { time: "12:00", label: "Almoço · 12h" },
  { time: "19:00", label: "Noite · 19h" },
];

function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

type Step = "dia" | "instalar";

/**
 * Depois do resumo do PRIMEIRO treino: marcar o próximo e instalar o app.
 *
 * Marcar dia e hora é um plano "quando e onde", e foi planejar + lembrar que
 * aumentou as idas à academia no megaestudo de 2021. O lembrete vira evento na
 * agenda porque o app, sem servidor, não notifica com ele fechado.
 *
 * Instalar vem aqui, e não na home antes do treino, porque agora existe algo a
 * proteger: no iPhone o Safari apaga dados de sites sem uso há 7 dias.
 */
export function FirstWorkoutNext({ next, onDone }: { next: Workout | null; onDone: () => void }) {
  const ref = useModalA11y<HTMLDivElement>(onDone);
  const titleId = useId();
  const today = localDateKey();

  // Meta e plataforma vêm do navegador: este componente só monta no cliente,
  // depois do treino, então ler aqui não afeta a hidratação.
  const [gap] = useState(() => suggestedGap(getWeekGoal() ?? 3));
  const [day, setDay] = useState<number>(gap);
  const [time, setTime] = useState(TIMES[0].time);
  const [ios] = useState(isIOS);
  const [canPrompt, setCanPrompt] = useState(() => !!getDeferredInstall());
  const needsInstall = !isStandalone() && (ios || canPrompt);
  const [step, setStep] = useState<Step>(next ? "dia" : "instalar");

  useEffect(() => {
    if (step === "instalar" && !needsInstall) onDone();
  }, [step, needsInstall, onDone]);

  const days = [1, 2, 3, 4].map((offset) => {
    const date = shiftDays(today, offset);
    const wd = weekdayOf(date);
    return { offset, date, short: WEEKDAY_SHORT[wd], hint: offset === 1 ? "amanhã" : `em ${offset} dias` };
  });
  const chosen = days.find((d) => d.offset === day)!;
  const dayName = WEEKDAY[weekdayOf(chosen.date)];

  const addToCalendar = () => {
    if (!next) return;
    const title = `Treino ${next.label} · ${next.title}`;
    const minutes = Math.max(15, Math.round(estimateDurationSeconds(next) / 60));
    downloadIcs(
      buildIcs({
        uid: uuid(),
        title,
        description: `~${minutes} min no Gravks.`,
        date: chosen.date,
        time,
        minutes,
        now: Date.now(),
      }),
      `treino-${next.label.toLowerCase()}-${chosen.date}.ics`
    );
    setNextSession({ date: chosen.date, time });
    setStep("instalar");
  };

  const install = async () => {
    await promptInstall();
    setCanPrompt(false);
    onDone();
  };

  if (step === "instalar" && !needsInstall) return null;

  return (
    <Portal>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex flex-col bg-bg outline-none anim-fade-in"
        style={next ? accentVars(next.accent) : undefined}
      >
        <div
          className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 overflow-y-auto px-5"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 2.25rem)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
          }}
        >
          {step === "dia" && next && (
            <>
              <p className="eyebrow-lg">
                Próximo · Treino {next.label} · {next.title}
              </p>
              <h1 id={titleId} className="display text-display leading-[1.05]">
                Quando é o próximo?
              </h1>
              {gap === 2 && (
                <p className="text-md text-muted">Um dia de folga entre os treinos ajuda a recuperar.</p>
              )}

              <div role="radiogroup" aria-label="Dia" className="grid grid-cols-4 gap-2">
                {days.map((d) => (
                  <button
                    key={d.offset}
                    type="button"
                    role="radio"
                    aria-checked={d.offset === day}
                    onClick={() => setDay(d.offset)}
                    className="option tap flex flex-col items-center rounded-card py-2.5 active:scale-[0.98]"
                  >
                    <span className="display text-xl leading-none">{d.short}</span>
                    <span className="mt-1 text-2xs text-muted">{d.hint}</span>
                  </button>
                ))}
              </div>

              <div role="radiogroup" aria-label="Horário" className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t.time}
                    type="button"
                    role="radio"
                    aria-checked={t.time === time}
                    onClick={() => setTime(t.time)}
                    className="option tap rounded-full px-4 py-2.5 text-sm font-medium active:scale-[0.98]"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <p className="text-sm text-muted">
                Vira um evento na sua agenda, com alarme na hora. É o calendário do celular que avisa.
              </p>

              <div className="mt-auto flex flex-col gap-1 pt-2">
                <button
                  type="button"
                  onClick={addToCalendar}
                  className="btn-primary tap w-full rounded-xl py-3.5 font-semibold"
                >
                  Pôr na agenda: {dayName}, {time.slice(0, 2).replace(/^0/, "")}h
                </button>
                <button
                  type="button"
                  onClick={() => setStep("instalar")}
                  className="tap py-2.5 text-sm text-muted underline underline-offset-4"
                >
                  Agora não
                </button>
              </div>
            </>
          )}

          {step === "instalar" && (
            <>
              <p className="eyebrow-lg">Seu histórico</p>
              <h1 id={titleId} className="display text-display leading-[1.05]">
                Seu treino ficou salvo neste celular
              </h1>
              <p className="text-md text-muted">
                {ios
                  ? "Sem conta, ele fica só aqui. No iPhone, o Safari pode apagar dados de sites que ficam 7 dias sem uso. Instalado na tela de início, isso não acontece."
                  : "Sem conta, ele fica só aqui. Instalado, o app abre sem internet e o histórico fica protegido da limpeza do navegador."}
              </p>

              {ios && (
                <ol className="card flex flex-col gap-2 px-4 py-3 text-sm">
                  <li>1. Toque em Compartilhar, embaixo no Safari</li>
                  <li>2. Escolha &ldquo;Adicionar à Tela de Início&rdquo;</li>
                </ol>
              )}

              <div className="mt-auto flex flex-col gap-1 pt-2">
                {ios ? (
                  <button
                    type="button"
                    onClick={onDone}
                    className="btn-primary tap w-full rounded-xl py-3.5 font-semibold"
                  >
                    Pronto
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="btn-primary tap w-full rounded-xl py-3.5 font-semibold"
                  >
                    Instalar
                  </button>
                )}
                <button
                  type="button"
                  onClick={onDone}
                  className="tap py-2.5 text-sm text-muted underline underline-offset-4"
                >
                  Depois
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
