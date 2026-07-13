"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getDayByWeekday, plan } from "@/lib/plan/loader";
import { getActiveSession, createSession } from "@/lib/db/repositories/sessions";
import { weekdayOf, localDateKey } from "@/lib/utils/date";
import { DayHeader } from "@/components/session/DayHeader";
import { DayPills } from "@/components/session/DayPills";
import { SessionRunner } from "@/components/session/SessionRunner";

export default function TodayPage() {
  const [starting, setStarting] = useState(false);
  const today = weekdayOf();
  const todayKey = localDateKey();

  // Template selecionado: hoje, se hoje for dia de treino; senão o primeiro.
  const [selected, setSelected] = useState<number>(() =>
    getDayByWeekday(today) ? today : plan.days[0].weekday
  );
  const day = getDayByWeekday(selected)!;

  const active = useLiveQuery(() => getActiveSession(), []);

  // Sem sessão ativa (tela de preview) → destrava o botão "Começar".
  // Evita que ele fique preso em "abrindo…" ao voltar de um treino finalizado.
  useEffect(() => {
    if (!active) setStarting(false);
  }, [active]);
  const completedForSelected = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return rows.find(
      (s) => s.status === "completed" && !s.deleted_at && s.weekday === selected
    );
  }, [todayKey, selected]);

  // Sessão em andamento → runner do template da PRÓPRIA sessão (não do dia atual)
  if (active) {
    const activeDay = getDayByWeekday(active.weekday) ?? day;
    return (
      <div style={{ ["--ac" as string]: activeDay.accent }}>
        <div className="px-4">
          <DayHeader day={activeDay} />
        </div>
        <SessionRunner session={active} day={activeDay} onFinished={() => {}} />
      </div>
    );
  }

  const start = async () => {
    setStarting(true);
    await createSession(selected);
    // useLiveQuery detecta a nova sessão e troca para o runner
  };

  return (
    <div className="px-4">
      <div className="pt-6">
        <DayPills selected={selected} today={today} onSelect={setSelected} />
      </div>

      <DayHeader day={day} />

      {!getDayByWeekday(today) && (
        <div className="mb-4 rounded-card border border-border bg-surface px-4 py-3 text-sm text-muted">
          Hoje é folga no plano. Escolha acima um treino para fazer mesmo assim.
        </div>
      )}

      {completedForSelected && (
        <div
          className="mb-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: day.accent, color: day.accent }}
        >
          Esse treino já foi registrado hoje. Começar de novo cria uma nova sessão.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {day.blocks.map((block) => (
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
                      style={block.is_skill ? { color: day.accent } : undefined}
                    >
                      {ex.name}
                    </span>
                    <span className="tnum shrink-0 text-sm text-muted">
                      {ex.target}
                    </span>
                  </div>
                  {ex.obs && (
                    <p className="mt-1 text-xs leading-snug text-muted">
                      {ex.obs}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="tap fixed inset-x-0 bottom-[76px] z-20 mx-auto w-[calc(100%-2rem)] max-w-[calc(28rem-2rem)] rounded-xl py-4 text-center font-semibold shadow-lg transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{ background: day.accent, color: "#0e0e0f" }}
      >
        {starting
          ? "abrindo…"
          : completedForSelected
            ? "Treinar de novo"
            : `Começar · ${day.title}`}
      </button>
      <div className="h-16" />
    </div>
  );
}
