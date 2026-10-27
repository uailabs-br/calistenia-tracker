"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricsSkeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/metrics/StatTile";
import { Badges } from "@/components/metrics/Badges";
import { FlagIncidenceRow } from "@/components/metrics/FlagIncidenceRow";
import { Sparkline } from "@/components/metrics/Sparkline";
import { ConsistencyHeatmap } from "@/components/metrics/ConsistencyHeatmap";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { ChevronDownIcon, HistoryIcon } from "@/components/ui/icons";
import { shortDate } from "@/lib/utils/date";
import {
  getOverview,
  getFlagIncidence,
  getLoggedExercises,
  getExerciseVolume,
  getBestHold,
  getActivityHeatmap,
} from "@/lib/db/queries/metrics";
import { DEFAULT_ACCENT, themedAccent } from "@/components/ui/accent";

// Cor das métricas: a do app, ou a única do tema tático.
const AC = themedAccent(DEFAULT_ACCENT);

export default function MetricasPage() {
  const overview = useLiveQuery(() => getOverview(), []);
  const heatmap = useLiveQuery(() => getActivityHeatmap(12), []);
  const flags = useLiveQuery(() => getFlagIncidence(), []);
  const exercises = useLiveQuery(() => getLoggedExercises(), []);
  const [exId, setExId] = useState<string>("");
  const volume = useLiveQuery(
    () => (exId ? getExerciseVolume(exId) : Promise.resolve([])),
    [exId]
  );
  const isHold = exercises?.find((e) => e.id === exId)?.unit === "seconds";
  const bestHold = useLiveQuery(
    () => (exId && isHold ? getBestHold(exId) : Promise.resolve([])),
    [exId, isHold]
  );
  const empty = overview && overview.totalWorkouts === 0;

  return (
    <div className="px-4">
      <PageHeader title="Evolução" />

      {!overview ? (
        <MetricsSkeleton />
      ) : empty ? (
        <p className="mt-8 text-center text-muted">
          Registre sessões para ver métricas.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatTile value={overview.totalWorkouts} label="treinos realizados" accent={AC} />
            <StatTile value={overview.last30Workouts} label="treinos em 30 dias" />
            <StatTile value={overview.currentStreak} label="semanas seguidas" accent={AC} />
            <StatTile value={overview.longestStreak} label="recorde de semanas" />
          </div>

          {/* Histórico não tem aba: é consulta, e mora aqui */}
          <SettingsGroup className="mt-4">
            <SettingsRow
              icon={HistoryIcon}
              label="Histórico"
              description={`${overview.totalWorkouts} ${
                overview.totalWorkouts === 1 ? "treino" : "treinos"
              }${overview.lastWorkoutDate ? ` · último em ${shortDate(overview.lastWorkoutDate)}` : ""}`}
              href="/historico"
            />
          </SettingsGroup>

          {/* Conquistas */}
          <Badges accent={AC} />

          {/* Equilíbrio entre treinos: quantas vezes cada um foi feito */}
          <h2 className="mb-2 mt-6 text-sm font-semibold">Equilíbrio entre treinos</h2>
          <div className="card flex flex-col gap-2 px-4 py-3">
            {overview.balanceByWorkout.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="w-8 font-mono text-xs text-muted">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, background: AC }}
                  />
                </div>
                <span className="tnum w-28 text-right text-xs text-muted">
                  {b.pct}% · {b.count}×
                </span>
              </div>
            ))}
          </div>

          {/* Calendário de constância: cada quadrado é um dia */}
          <h2 className="mb-2 mt-6 text-sm font-semibold">Últimas 12 semanas</h2>
          <div className="card px-4 py-3">
            {heatmap && <ConsistencyHeatmap weeks={heatmap} />}
          </div>

          {/* Incidência de flags - métrica principal */}
          <h2 className="mb-1 mt-6 text-sm font-semibold">Incidência de flags</h2>
          <p className="mb-2 text-xs text-muted">
            Cheia = padrão ocorreu. Antigas → recentes.
          </p>
          {flags && flags.length > 0 ? (
            <div className="flex flex-col gap-2">
              {flags.map((item) => (
                <FlagIncidenceRow
                  key={`${item.exerciseId}:${item.flag}`}
                  item={item}
                  accent={AC}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">
              Nenhuma flag marcada ainda nas sessões.
            </p>
          )}

          {/* Volume por exercício */}
          <h2 className="mb-2 mt-6 text-sm font-semibold">Volume por exercício</h2>
          {exercises && exercises.length > 0 ? (
            <div className="card px-4 py-3">
              <div className="relative">
                <select
                  value={exId}
                  onChange={(e) => setExId(e.target.value)}
                  className="tap w-full appearance-none rounded-lg border border-border bg-surface2 px-3 py-2 pr-9 text-base text-text outline-none focus:border-muted"
                >
                  <option value="">Escolha um exercício…</option>
                  {exercises.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
              {exId && (
                <div className="mt-3">
                  <Sparkline points={volume ?? []} accent={AC} />
                  {volume && volume.length > 0 && (
                    <p className="tnum mt-1 text-xs text-muted">
                      {volume.length}{" "}
                      {volume.length === 1 ? "sessão" : "sessões"} · último:{" "}
                      {volume[volume.length - 1].volume}
                    </p>
                  )}
                </div>
              )}
              {exId && isHold && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium text-muted">
                    Melhor hold (s)
                  </p>
                  <Sparkline points={bestHold ?? []} accent={AC} />
                  {bestHold && bestHold.length > 0 && (
                    <p className="tnum mt-1 text-xs text-muted">
                      recorde atual: {Math.max(...bestHold.map((p) => p.volume))}s
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">Sem exercícios registrados.</p>
          )}

          <div className="h-4" />
        </>
      )}
    </div>
  );
}
