"use client";

import Link from "next/link";
import type { HomeAchievements } from "@/lib/db/queries/badges";
import { useTimeline } from "@/lib/utils/useTimeline";
import { useFirstView } from "@/lib/utils/useFirstView";
import { countAt } from "@/lib/domain/timeline";
import { MedalIcon, TrophyIcon } from "@/components/ui/icons";

const BADGE_COUNT = { start: 150, ms: 750 };
const RECORD_COUNT = { start: 700, ms: 450 };
const END = RECORD_COUNT.start + RECORD_COUNT.ms + 300;

/** Tranco curto quando o número chega: o mesmo da tela de recorde. */
function bump(t: number, at: number): React.CSSProperties {
  const on = t >= at && t < at + 220;
  return {
    transform: `scale(${on ? 1.18 : 1})`,
    transition: "transform 0.18s cubic-bezier(0.3, 1.6, 0.5, 1)",
  };
}

/**
 * Conquistas na home: o selo mais difícil já ganho e o último recorde, em número
 * grande. Os números sobem na primeira vez que a home abre — é o "olha onde você
 * chegou" — e o recorde parte do valor anterior, pra o salto ficar à vista.
 * Voltando pra home, já aparecem prontos. Some sem nenhum selo.
 */
export function AchievementsCard({ data }: { data: HomeAchievements }) {
  const t = useTimeline(END, useFirstView("home"));
  const { badge, record } = data;
  if (!badge) return null;

  const u = record?.unit === "seconds" ? "s" : "";

  return (
    <section
      aria-label="Conquistas"
      className={`anim-fade-in-up grid gap-2 ${record ? "grid-cols-2" : "grid-cols-1"}`}
    >
      <Link
        href="/metricas"
        className="glass tap flex flex-col rounded-card border border-ac/40 bg-ac/14 px-3.5 py-2.5 active:scale-[0.99]"
      >
        <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wide text-ac">
          <MedalIcon className="h-3.5 w-3.5" />
          Conquista
        </span>
        <span className="mt-1 flex items-baseline gap-1.5">
          <span
            className="stat-num display tnum inline-block text-display leading-none text-ac"
            style={bump(t, BADGE_COUNT.start + BADGE_COUNT.ms)}
            aria-label={`${badge.value} ${badge.unit}`}
          >
            {countAt(t, badge.value, BADGE_COUNT.start, BADGE_COUNT.ms)}
          </span>
          <span className="stat-unit text-sm font-semibold">{badge.unit}</span>
        </span>
        {badge.next && <span className="mt-1 text-xs text-muted">{badge.next}</span>}
      </Link>

      {record && (
        <Link
          href="/metricas"
          className="glass tap flex min-w-0 flex-col rounded-card border px-3.5 py-2.5 active:scale-[0.99]"
          style={{
            borderColor: "color-mix(in oklab, var(--color-gold) 25%, var(--color-border))",
            background: "color-mix(in oklab, var(--color-gold) 5%, var(--color-surface))",
          }}
        >
          <span className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wide text-gold">
            <TrophyIcon className="h-3.5 w-3.5" />
            Recorde
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span
              className="stat-num display tnum inline-block text-display leading-none text-gold"
              style={bump(t, RECORD_COUNT.start + RECORD_COUNT.ms)}
              aria-label={`${record.value}${u ? " segundos" : " reps"}`}
            >
              {countAt(t, record.value, RECORD_COUNT.start, RECORD_COUNT.ms, record.previous)}
            </span>
            <span className="stat-unit text-sm font-semibold">{u || "reps"}</span>
            <span
              className="ml-auto rounded-full bg-gold/14 px-2 py-0.5 font-mono text-2xs text-gold transition-opacity"
              style={{ opacity: t >= RECORD_COUNT.start + RECORD_COUNT.ms ? 1 : 0 }}
            >
              +{record.value - record.previous}
              {u}
            </span>
          </span>
          {/* o nome encurta, o "era" não: é ele que mostra o salto */}
          <span className="mt-1 flex gap-1 text-xs text-muted">
            <span className="min-w-0 truncate">{record.name}</span>
            <span className="shrink-0">
              · era {record.previous}
              {u}
            </span>
          </span>
        </Link>
      )}
    </section>
  );
}
