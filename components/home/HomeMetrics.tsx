"use client";

import Link from "next/link";
import { StatTile } from "@/components/metrics/StatTile";
import { Sparkline } from "@/components/metrics/Sparkline";
import type { HeroEvolution } from "@/lib/db/queries/metrics";

const AC = "#a89cff";

/** Métricas-chave do painel: volume 30d, RPE e destaque de evolução. */
export function HomeMetrics({
  last30,
  avgRpe,
  hero,
}: {
  last30: number;
  avgRpe: number | null;
  hero: HeroEvolution | null;
}) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Métricas</h2>
        <Link href="/metricas" className="tap text-xs text-muted">
          ver tudo →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile value={last30} label="treinos em 30 dias" accent={AC} />
        <StatTile value={avgRpe ?? "—"} label="RPE médio (4 sem)" />
      </div>

      {hero && (
        <Link
          href="/metricas"
          className="tap mt-2 block rounded-card border border-border bg-surface px-4 py-3 active:scale-[0.99]"
        >
          <div className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted">Evolução</p>
              <p className="truncate font-medium">{hero.name}</p>
            </div>
            {hero.deltaPct !== null && (
              <span
                className="tnum shrink-0 text-sm font-semibold"
                style={{
                  color:
                    hero.deltaPct > 0
                      ? "var(--color-success)"
                      : hero.deltaPct < 0
                        ? "var(--color-warn)"
                        : "var(--color-muted)",
                }}
              >
                {hero.deltaPct > 0 ? "↑" : hero.deltaPct < 0 ? "↓" : ""}
                {Math.abs(hero.deltaPct)}%
              </span>
            )}
          </div>
          <div className="mt-2">
            <Sparkline points={hero.points} accent={AC} />
          </div>
        </Link>
      )}
    </section>
  );
}
