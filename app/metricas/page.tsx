"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { PageHeader } from "@/components/ui/PageHeader";
import { MetricsSkeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/metrics/StatTile";
import { Badges } from "@/components/metrics/Badges";
import { FlagIncidenceRow } from "@/components/metrics/FlagIncidenceRow";
import { Sparkline } from "@/components/metrics/Sparkline";
import { ChevronDownIcon } from "@/components/ui/icons";
import {
  getOverview,
  getFlagIncidence,
  getLoggedExercises,
  getExerciseVolume,
  getBestHold,
} from "@/lib/db/queries/metrics";
import { getExerciseById } from "@/lib/plan/loader";
import { getWeekHistory, buildWeekReviewTexts } from "@/lib/db/queries/weekReview";
import { shortDate } from "@/lib/utils/date";

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
  const isHold = exId ? getExerciseById(exId)?.parsed?.unit === "seconds" : false;
  const bestHold = useLiveQuery(
    () => (exId && isHold ? getBestHold(exId) : Promise.resolve([])),
    [exId, isHold]
  );
  const weekHistory = useLiveQuery(() => getWeekHistory(), []);

  const empty = overview && overview.totalWorkouts === 0;

  return (
    <div className="px-4">
      <PageHeader title="Métricas" subtitle="do log, sem invenção" />

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
            <StatTile
              value={overview.avgRpe4w ?? "-"}
              label="RPE médio (4 sem)"
            />
          </div>

          {/* Conquistas */}
          <Badges accent={AC} />

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

          {/* Histórico semanal consultável */}
          {weekHistory && weekHistory.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 text-sm font-semibold">Histórico semanal</h2>
              <div className="flex flex-col gap-2">
                {weekHistory.map((r) => {
                  const t = buildWeekReviewTexts(r);
                  return (
                    <div
                      key={r.weekStart}
                      className="rounded-card border border-border bg-surface px-4 py-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs uppercase tracking-wide text-muted">
                          {shortDate(r.weekStart)}–{shortDate(r.weekEnd)}
                        </span>
                        <span className="tnum text-sm font-semibold">
                          {r.daysDone}/{r.planTotal}
                          {r.volumeDeltaPct !== null && (
                            <span className="ml-2 text-xs font-normal text-muted">
                              vol {r.volumeDeltaPct > 0 ? "+" : ""}
                              {r.volumeDeltaPct}%
                            </span>
                          )}
                          {r.avgRpe !== null && (
                            <span className="ml-2 text-xs font-normal text-muted">
                              rpe {r.avgRpe}
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">{t.good}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="h-4" />
        </>
      )}
    </div>
  );
}
