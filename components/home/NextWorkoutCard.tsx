"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Workout } from "@/lib/plan/schema";
import { durationLabel } from "@/lib/domain/estimateDuration";
import { remainingSessions, shortSkillName, statusLabel } from "@/lib/domain/campaign";
import { getWorkoutCampaign } from "@/lib/db/queries/campaign";
import { getAiGoals } from "@/lib/utils/aiPersona";
import { useDurationFactor } from "@/lib/utils/useDurationFactor";
import { getNextSession } from "@/lib/utils/nextSession";
import { localDateKey, shiftDays } from "@/lib/utils/date";
import { StreakBar } from "@/components/session/StreakBar";
import {
  ChevronDownIcon,
  PlayIcon,
  CheckIcon,
} from "@/components/ui/icons";
import { accentVars, themedAccent, themedAccentBg } from "@/components/ui/accent";

/** Hero do painel: o próximo treino da sequência, com CTA de 1 toque e exercícios. */
export function NextWorkoutCard({
  workout,
  activeHere,
  doneToday,
  first = false,
  returning = false,
}: {
  /** próximo treino da fila; null enquanto o histórico carrega. */
  workout: Workout | null;
  /** há sessão em andamento deste treino */
  activeHere: boolean;
  /** rótulos dos treinos do plano já concluídos hoje, para o aviso discreto */
  doneToday: string[];
  /** nenhum treino concluído ainda: o card diz que é o primeiro */
  first?: boolean;
  /** volta depois de uma pausa (ver ReturnCard): o botão fala em voltar */
  returning?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const factor = useDurationFactor();
  // Objetivos vêm do localStorage: só depois do mount (regra 10).
  const [goals, setGoals] = useState<string[]>([]);
  useEffect(() => setGoals(getAiGoals()), []);
  // Dia marcado no fim do primeiro treino (ver FirstWorkoutNext), enquanto não passou.
  const [scheduled, setScheduled] = useState<string | null>(null);
  useEffect(() => {
    const n = getNextSession();
    const today = localDateKey();
    if (!n || n.date < today) return;
    const day =
      n.date === today
        ? "hoje"
        : n.date === shiftDays(today, 1)
          ? "amanhã"
          : new Date(n.date + "T00:00:00")
              .toLocaleDateString("pt-BR", { weekday: "long" })
              .replace("-feira", "");
    setScheduled(`${day}, ${Number(n.time.slice(0, 2))}h`);
  }, []);
  const campaign = useLiveQuery(
    async () => (workout ? getWorkoutCampaign(workout, goals) : []),
    [workout, goals]
  );

  if (!workout) return null;

  const exercises = workout.blocks.flatMap((b) =>
    b.exercises.map((e) => ({ ...e, isSkill: b.is_skill }))
  );

  return (
    <section
      className="anim-fade-in-up glow rounded-card p-5"
      style={{ ...accentVars(workout.accent), background: themedAccentBg(workout.accent_bg) }}
    >
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2 py-0.5 font-mono text-xs"
          style={{ background: themedAccent(workout.accent), color: "var(--color-on-accent)" }}
        >
          {workout.label}
        </span>
        <span className="font-mono text-xs text-muted">{durationLabel(workout, factor)}</span>
        <span className="font-mono text-xs text-muted">
          · {exercises.length} exercícios
        </span>
      </div>

      <h2 className="display mt-2 text-3xl leading-tight">{workout.title}</h2>
      {first && <p className="mt-1 text-sm text-muted">Seu primeiro treino.</p>}
      {!first && scheduled && <p className="mt-1 text-sm text-muted">Marcado pra {scheduled}.</p>}

      {/* Objetivos que este treino move; o que ele não toca não aparece. */}
      {campaign && campaign.length > 0 && (
        <ul className="anim-fade-in mt-3 flex flex-col gap-2 rounded-xl bg-ac/10 px-3 py-2.5">
          {campaign.map((it) => (
            <li key={it.skillId} className="flex items-center gap-2.5 text-sm">
              <StreakBar total={it.required} filled={Math.min(it.streak, it.required)} size="sm" />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{shortSkillName(it.skillName)}</span> · nível {it.level}
              </span>
              <span
                className={`shrink-0 font-mono text-xs ${remainingSessions(it) <= 1 ? "text-ac" : "text-muted"}`}
              >
                {statusLabel(it)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {doneToday.length > 0 && !activeHere && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <CheckIcon className="h-3.5 w-3.5" />
          Hoje já concluído: {doneToday.join(", ")}
        </p>
      )}

      {activeHere ? (
        <Link
          href={`/treino/${workout.id}`}
          className="btn-primary anim-ring tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-center font-semibold"
          style={accentVars(workout.accent)}
        >
          Continuar treino
        </Link>
      ) : (
        // Começa direto, sem a prévia do treino: a home já mostra objetivo e
        // exercícios. O centro do botão vai na URL pra a tela de carregamento
        // abrir a partir dele.
        <button
          type="button"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = Math.round(r.left + r.width / 2);
            const y = Math.round(r.top + r.height / 2);
            router.push(`/treino/${workout.id}?start=${x},${y}`);
          }}
          className="btn-primary anim-ring tap mt-4 flex w-full items-center justify-center rounded-xl py-3.5 text-center font-semibold"
          style={accentVars(workout.accent)}
        >
          {returning ? `Voltar com o treino ${workout.label}` : "Começar treino"}
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap mt-2 flex w-full items-center justify-center gap-1 py-2 text-sm text-muted"
      >
        {open ? "Ocultar exercícios" : "Ver exercícios"}
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="anim-fade-in mt-1 flex flex-col gap-1">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <Link
                href={`/treino/${workout.id}?ex=${ex.id}`}
                className="tap flex items-center justify-between gap-3 rounded-lg px-2 py-2 active:scale-[0.99]"
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate text-sm font-medium"
                    style={ex.isSkill ? { color: themedAccent(workout.accent) } : undefined}
                  >
                    {ex.name}
                  </span>
                  <span className="tnum text-xs text-muted">{ex.target}</span>
                </span>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: themedAccent(workout.accent), color: "var(--color-on-accent)" }}
                  aria-label={`Treinar ${ex.name}`}
                >
                  <PlayIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
