"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/metrics/StatTile";
import { FlagIncidenceRow } from "@/components/metrics/FlagIncidenceRow";
import { Sparkline } from "@/components/metrics/Sparkline";
import {
  getOverview,
  getFlagIncidence,
  getLoggedExercises,
  getExerciseVolume,
} from "@/lib/db/queries/metrics";

const AC = "#a89cff"; // accent neutro das métricas (roxo MU)

export default function MetricasPage() {
  const overview = useLiveQuery(() => getOverview(), []);
  const flags = useLiveQuery(() => getFlagIncidence(), []);
  const exercises = useLiveQuery(() => getLoggedExercises(), []);
  const [exId, setExId] = useState<string>("");
  const volume = useLiveQuery(
    () => (exId ? getExerciseVolume(exId) : Promise.resolve([])),
    [exId]
  );

  const empty = overview && overview.totalWorkouts === 0;

  return (
    <div className="px-4">
      <PageHeader title="Métricas" subtitle="do log, sem invenção" />

      {empty ? (
        <p className="mt-8 text-center text-muted">
          Registre sessões para ver métricas.
        </p>
      ) : !overview ? (
        <p className="text-muted">Carregando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatTile value={overview.totalWorkouts} label="treinos realizados" accent={AC} />
            <StatTile value={overview.last30Workouts} label="treinos em 30 dias" />
            <StatTile value={overview.currentStreak} label="sequência de dias" accent={AC} />
            <StatTile value={overview.longestStreak} label="maior sequência" />
            <StatTile
              value={overview.avgRpe4w ?? "-"}
              label="RPE médio (4 sem)"
            />
          </div>

          {/* Aderência por dia */}
          <h2 className="mb-2 mt-6 text-sm font-semibold">Aderência por dia</h2>
          <div className="flex flex-col gap-2 rounded-card border border-border bg-surface px-4 py-3">
            {overview.adherenceByWeekday.map((d) => (
              <div key={d.weekday} className="flex items-center gap-3">
                <span className="w-8 font-mono text-xs text-muted">{d.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.pct}%`, background: AC }}
                  />
                </div>
                <span className="tnum w-10 text-right text-xs text-muted">
                  {d.pct}%
                </span>
              </div>
            ))}
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
            <div className="rounded-card border border-border bg-surface px-4 py-3">
              <select
                value={exId}
                onChange={(e) => setExId(e.target.value)}
                className="tap w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none"
              >
                <option value="">Escolha um exercício…</option>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
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
