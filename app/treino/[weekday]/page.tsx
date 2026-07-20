"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/schema";
import { getDayByWeekday, plan } from "@/lib/plan/loader";
import { getActiveSession, createSession } from "@/lib/db/repositories/sessions";
import { localDateKey } from "@/lib/utils/date";
import { DayHeader } from "@/components/session/DayHeader";
import { DayPills } from "@/components/session/DayPills";
import { SessionRunner } from "@/components/session/SessionRunner";
import { CollapsibleTip } from "@/components/session/CollapsibleTip";
import { WarmupCard } from "@/components/session/WarmupCard";
import { ChevronRightIcon } from "@/components/ui/icons";

export default function TreinoPage() {
  const params = useParams<{ weekday: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const urlWeekday = Number(params.weekday);
  const todayKey = localDateKey();
  const initialEx = search.get("ex") ?? undefined;

  // Template pela URL; se não for dia de plano (folga), cai no primeiro do plano.
  const [selected, setSelected] = useState<number>(() =>
    getDayByWeekday(urlWeekday) ? urlWeekday : plan.days[0].weekday
  );
  const day = getDayByWeekday(selected)!;

  const [starting, setStarting] = useState(false);
  // null = carregado sem sessão; undefined = ainda carregando (distinção importa
  // para o auto-start do deep-link não disparar antes da hora).
  const active = useLiveQuery(async () => (await getActiveSession()) ?? null, []);

  useEffect(() => {
    if (active === null) setStarting(false);
  }, [active]);

  const completedForSelected = useLiveQuery(async () => {
    const rows = await db.sessions.where("date").equals(todayKey).toArray();
    return rows.find(
      (s) => s.status === "completed" && !s.deleted_at && s.weekday === selected
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

  // Sessão em andamento → runner do template da PRÓPRIA sessão.
  if (active) {
    const activeDay = getDayByWeekday(active.weekday) ?? day;
    return (
      <div style={{ ["--ac" as string]: activeDay.accent }}>
        <div className="px-4">
          <DayHeader day={activeDay} />
        </div>
        <SessionRunner
          session={active}
          day={activeDay}
          initialExerciseId={initialEx}
          onFinished={() => router.push("/")}
        />
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="pt-6">
        <DayPills selected={selected} today={urlWeekday} onSelect={setSelected} />
      </div>

      <DayHeader day={day} />

      <button
        type="button"
        onClick={start}
        disabled={starting}
        className="tap w-full rounded-xl py-3.5 text-center font-semibold shadow-lg transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{ background: day.accent, color: "var(--color-on-accent)" }}
      >
        {starting
          ? "Abrindo…"
          : completedForSelected
            ? "Treinar de novo"
            : `Começar · ${day.title}`}
      </button>

      {completedForSelected && (
        <div
          className="mb-4 mt-4 rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: day.accent, color: day.accent }}
        >
          Esse treino já foi registrado hoje. Começar de novo cria uma nova sessão.
        </div>
      )}

      {day.progression.length > 0 && (
        <Link
          href={`/skills/${day.weekday}`}
          className="tap mt-3 flex items-center justify-between rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
        >
          <span className="text-sm font-medium">Mapa da skill · {day.skill}</span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
        </Link>
      )}

      {/* título → começar → por que → aquecimento → exercícios */}
      <CollapsibleTip tip={day.tip} accent={day.accent} />
      {day.warmup && (
        <div className="mt-3">
          <WarmupCard
            warmup={day.warmup}
            accent={day.accent}
            accentBg={day.accent_bg}
          />
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-2">
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

      <div className="h-8" />
    </div>
  );
}
